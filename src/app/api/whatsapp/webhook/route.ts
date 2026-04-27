import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { Lead } from "@/models/lead";
import { runAthena, detectLanguageFromText } from "@/lib/whatsapp/athena";
import { sendWhatsAppText, normalizePhone } from "@/lib/whatsapp/send";
import { downloadAndStoreMedia, pickMediaFromMessage } from "@/lib/whatsapp/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SnsEnvelope {
  Type?: string;
  MessageId?: string;
  Token?: string;
  TopicArn?: string;
  Subject?: string;
  Message?: string;
  Timestamp?: string;
  SubscribeURL?: string;
}

interface MetaValue {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  messages?: Array<{
    from?: string;
    id?: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
    image?: { id?: string; mime_type?: string };
    audio?: { id?: string; mime_type?: string };
    document?: { id?: string; mime_type?: string; filename?: string };
    button?: { text?: string };
    interactive?: {
      button_reply?: { title?: string };
      list_reply?: { title?: string };
    };
  }>;
  statuses?: Array<{
    id?: string;
    status?: string;
    recipient_id?: string;
    timestamp?: string;
    errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>;
    conversation?: { id?: string; origin?: { type?: string } };
    pricing?: { billable?: boolean; pricing_model?: string; category?: string };
  }>;
}

interface MetaChange {
  value?: MetaValue;
  field?: string;
}

interface MetaEntry {
  id?: string;
  changes?: MetaChange[];
}

interface MetaPayload {
  object?: string;
  entry?: MetaEntry[];
}

interface AwsSocialMessagingPayload {
  context?: {
    MetaWabaIds?: Array<{ wabaId?: string; arn?: string }>;
    MetaPhoneNumberIds?: Array<{ metaPhoneNumberId?: string; arn?: string }>;
  };
  aws?: {
    phoneNumber?: string;
    phoneNumberId?: string;
    configurationSetName?: string;
  };
  whatsAppWebhookEntry?: MetaEntry | string;
  webhookEntry?: MetaEntry | string;
  aws_account_id?: string;
  message_timestamp?: string;
}

function extractMetaPayload(
  message: string
): { payload: MetaPayload; phoneNumberId?: string } | null {
  try {
    const parsed = JSON.parse(message) as AwsSocialMessagingPayload & MetaPayload;

    const rawEntry: MetaEntry | string | undefined =
      parsed.whatsAppWebhookEntry ?? parsed.webhookEntry;

    if (rawEntry) {
      const entry: MetaEntry =
        typeof rawEntry === "string"
          ? (JSON.parse(rawEntry) as MetaEntry)
          : rawEntry;

      const phoneNumberId =
        parsed.context?.MetaPhoneNumberIds?.[0]?.metaPhoneNumberId ||
        entry.changes?.[0]?.value?.metadata?.phone_number_id ||
        parsed.aws?.phoneNumberId;

      return { payload: { entry: [entry] }, phoneNumberId };
    }

    if (Array.isArray(parsed.entry)) {
      const phoneNumberId =
        parsed.entry[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
      return { payload: parsed as MetaPayload, phoneNumberId };
    }

    return null;
  } catch (err) {
    console.warn("[whatsapp-webhook] extractMetaPayload threw:", err);
    return null;
  }
}

function extractTextFromMetaMessage(msg: NonNullable<MetaValue["messages"]>[number]): string {
  if (msg.text?.body) return msg.text.body;
  if (msg.button?.text) return msg.button.text;
  if (msg.interactive?.button_reply?.title) return msg.interactive.button_reply.title;
  if (msg.interactive?.list_reply?.title) return msg.interactive.list_reply.title;

  const m = msg as NonNullable<MetaValue["messages"]>[number] & {
    image?: { caption?: string };
    video?: { caption?: string };
    document?: { caption?: string; filename?: string };
    audio?: { voice?: boolean };
  };
  if (msg.type === "image") {
    return m.image?.caption ? `[image: ${m.image.caption}]` : "[image]";
  }
  if (msg.type === "audio") {
    return m.audio?.voice ? "[voice note]" : "[audio]";
  }
  if (msg.type === "video") {
    return m.video?.caption ? `[video: ${m.video.caption}]` : "[video]";
  }
  if (msg.type === "document") {
    const parts: string[] = [];
    if (m.document?.filename) parts.push(m.document.filename);
    if (m.document?.caption) parts.push(m.document.caption);
    return `[document${parts.length ? ": " + parts.join(" — ") : ""}]`;
  }
  if (msg.type === "sticker") return "[sticker]";
  return "[unsupported message type]";
}

async function handleSubscriptionConfirmation(env: SnsEnvelope): Promise<void> {
  if (!env.SubscribeURL) return;
  try {
    await fetch(env.SubscribeURL, { method: "GET" });
    console.log("[whatsapp-webhook] SNS subscription confirmed");
  } catch (err) {
    console.error("[whatsapp-webhook] SubscribeURL fetch failed:", err);
  }
}

async function processInboundMessage(
  phoneNumberId: string | undefined,
  customerPhone: string,
  profileName: string | undefined,
  messageText: string,
  waMessageId: string | undefined,
  rawMsg?: NonNullable<MetaValue["messages"]>[number]
): Promise<void> {
  let botConfig = phoneNumberId
    ? await WhatsAppBotConfig.findOne({ phoneNumberId })
    : null;

  if (!botConfig) {
    const total = await WhatsAppBotConfig.countDocuments();
    if (total === 1) {
      botConfig = await WhatsAppBotConfig.findOne({});
      console.warn(
        `[whatsapp-webhook] No exact phoneNumberId match for ${phoneNumberId}, falling back to the only existing bot config`
      );
    }
  }

  if (!botConfig) {
    console.warn(
      `[whatsapp-webhook] No bot config for phoneNumberId=${phoneNumberId} and no fallback. Skipping.`
    );
    return;
  }

  const normPhone = normalizePhone(customerPhone);

  let conversation = await WhatsAppConversation.findOne({
    userId: botConfig.userId,
    waPhone: normPhone,
  });

  // Detect language from THIS customer message (greeting "Hola" = es, "Hello" = en).
  // For new conversations, this becomes the locked language. For existing, only override
  // when we have strong evidence the customer switched.
  const detectedLang = detectLanguageFromText(messageText);

  if (!conversation) {
    conversation = await WhatsAppConversation.create({
      userId: botConfig.userId,
      waPhone: normPhone,
      profileName,
      status: "active",
      language: detectedLang,
      temperature: "unknown",
      unread: true,
      unreadCount: 0,
      messages: [],
      lastMessagePreview: "",
      lastMessageAt: new Date(),
    });
  } else {
    if (profileName && !conversation.profileName) {
      conversation.profileName = profileName;
    }
    // Only override existing language if the very first customer message in conversation
    // is the one we're processing (i.e. conversation has no customer messages yet)
    const hasPriorCustomerMsg = (conversation.messages || []).some(
      (m: { role: string }) => m.role === "customer"
    );
    if (!hasPriorCustomerMsg) {
      conversation.language = detectedLang;
    }
  }

  // Detect + download media if present
  let mediaUrl: string | undefined;
  let mediaType: string | undefined;
  if (rawMsg) {
    const picked = pickMediaFromMessage(rawMsg);
    if (picked) {
      console.log(
        `[whatsapp-webhook] downloading ${picked.category} media id=${picked.info.id}`
      );
      const stored = await downloadAndStoreMedia(
        picked.info.id,
        picked.category,
        String(conversation._id),
        picked.info.filename
      );
      if (stored) {
        mediaUrl = stored.url;
        mediaType = stored.mimeType;
        console.log(`[whatsapp-webhook] stored media at ${stored.url} (${stored.size} bytes)`);
      }
    }
  }

  conversation.messages.push({
    role: "customer",
    content: messageText,
    waMessageId,
    mediaUrl,
    mediaType,
    timestamp: new Date(),
  });
  conversation.lastCustomerMessageAt = new Date();
  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = messageText.slice(0, 120);
  conversation.unread = true;
  conversation.unreadCount = (conversation.unreadCount || 0) + 1;

  if (conversation.status === "human_handoff") {
    await conversation.save();
    console.log(
      `[whatsapp-webhook] ${normPhone} is in human_handoff — message stored, no bot reply`
    );
    return;
  }

  if (!botConfig.enabled) {
    await conversation.save();
    return;
  }

  await conversation.save();

  const existingLead = await Lead.findOne({
    userId: botConfig.userId,
    conversationId: conversation._id,
  });
  type StoredSignal = { rule: string; delta: number; evidence: string; timestamp: Date };
  const priorSignals: StoredSignal[] = (existingLead?.signals || []) as StoredSignal[];

  const athena = await runAthena(conversation, botConfig, priorSignals);

  const emittedRules = new Set(priorSignals.map((s: StoredSignal) => s.rule));
  const uniqueNewSignals = (athena.newSignals || []).filter(
    (s) => s.rule && !emittedRules.has(s.rule)
  );

  if (athena.shouldHandoff) {
    conversation.status = "human_handoff";
    conversation.handoffReason = athena.handoffReason;
  }

  if ((athena.qualified && athena.leadData) || uniqueNewSignals.length > 0) {
    const allSignals = [
      ...priorSignals.map((s: StoredSignal) => ({
        rule: s.rule,
        delta: s.delta,
        evidence: s.evidence,
        timestamp: s.timestamp,
      })),
      ...uniqueNewSignals.map((s) => ({
        rule: s.rule,
        delta: s.delta,
        evidence: s.evidence,
        timestamp: new Date(),
      })),
    ];

    const signalSum = allSignals.reduce((acc, s) => acc + (s.delta || 0), 0);
    const computedScore = Math.max(0, Math.min(100, 40 + signalSum));

    let computedTemp: "hot" | "warm" | "cold";
    if (computedScore >= 70) computedTemp = "hot";
    else if (computedScore >= 45) computedTemp = "warm";
    else computedTemp = "cold";

    conversation.temperature = computedTemp;
    if (athena.leadData?.summary) {
      conversation.qualificationNotes = athena.leadData.summary;
    }

    const ctx = athena.patientContext || {};
    const leadPayload = {
      userId: botConfig.userId,
      conversationId: conversation._id,
      waPhone: normPhone,
      name: athena.leadData?.name || existingLead?.name,
      temperature: computedTemp,
      painLevel: ctx.painLevel ?? existingLead?.painLevel,
      painLocation: ctx.painLocation || existingLead?.painLocation,
      painDuration:
        ctx.painDuration || athena.leadData?.painDuration || existingLead?.painDuration,
      diagnosis: ctx.diagnosis || athena.leadData?.diagnosis || existingLead?.diagnosis,
      hasMRI: ctx.hasMRI !== undefined ? ctx.hasMRI : existingLead?.hasMRI,
      priorTreatments:
        ctx.priorTreatments && ctx.priorTreatments.length > 0
          ? ctx.priorTreatments
          : existingLead?.priorTreatments,
      urgency: ctx.urgency || athena.leadData?.urgency || existingLead?.urgency,
      hasInsurance:
        ctx.hasInsurance !== undefined
          ? ctx.hasInsurance
          : athena.leadData?.hasInsurance !== undefined
          ? athena.leadData.hasInsurance
          : existingLead?.hasInsurance,
      location: ctx.location || athena.leadData?.location || existingLead?.location,
      intakeSummary: ctx.intakeSummary || existingLead?.intakeSummary || "",
      summary: athena.leadData?.summary || existingLead?.summary || "",
      score: computedScore,
      signals: allSignals,
    };

    if (existingLead) {
      Object.assign(existingLead, leadPayload);
      await existingLead.save();
    } else {
      await Lead.create(leadPayload);
    }
  }

  // Mirror patient context onto the conversation so handoff humans see it without joining
  if (athena.patientContext) {
    const ctx = athena.patientContext;
    const current = (conversation.patientContext || {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...current };
    if (ctx.painLevel !== undefined) merged.painLevel = ctx.painLevel;
    if (ctx.painLocation) merged.painLocation = ctx.painLocation;
    if (ctx.painDuration) merged.painDuration = ctx.painDuration;
    if (ctx.hasMRI !== undefined) merged.hasMRI = ctx.hasMRI;
    if (ctx.diagnosis) merged.diagnosis = ctx.diagnosis;
    if (ctx.priorTreatments && ctx.priorTreatments.length > 0)
      merged.priorTreatments = ctx.priorTreatments;
    if (ctx.urgency) merged.urgency = ctx.urgency;
    if (ctx.hasInsurance !== undefined) merged.hasInsurance = ctx.hasInsurance;
    if (ctx.location) merged.location = ctx.location;
    if (ctx.intakeSummary) merged.intakeSummary = ctx.intakeSummary;
    merged.lastUpdated = new Date();
    (conversation as unknown as { patientContext: unknown }).patientContext = merged;
  }

  conversation.language = athena.language;

  try {
    const sendResult = await sendWhatsAppText({
      originationIdentity: botConfig.originationIdentity,
      toPhone: normPhone,
      text: athena.reply,
    });
    console.log(
      `[whatsapp-webhook] send OK to=${normPhone} messageId=${sendResult.messageId || "?"} replyLen=${athena.reply.length}`
    );

    conversation.messages.push({
      role: "bot",
      content: athena.reply,
      timestamp: new Date(),
    });
    conversation.lastBotMessageAt = new Date();
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = athena.reply.slice(0, 120);
  } catch (err) {
    const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number; requestId?: string } };
    console.error(
      `[whatsapp-webhook] send FAILED to=${normPhone} name=${e.name} msg=${e.message} http=${e.$metadata?.httpStatusCode} reqid=${e.$metadata?.requestId}`
    );
  }

  await conversation.save();
}

export async function POST(req: NextRequest) {
  const messageType = req.headers.get("x-amz-sns-message-type");
  const rawBody = await req.text();

  console.log("[whatsapp-webhook] raw body:", rawBody.slice(0, 4000));

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    console.warn("[whatsapp-webhook] body was not JSON");
    return new Response("Invalid JSON", { status: 200 });
  }

  // Handle SNS-wrapped payloads (legacy AWS End User Messaging path)
  const envelope = parsedBody as SnsEnvelope;
  if (envelope.Type === "SubscriptionConfirmation" || messageType === "SubscriptionConfirmation") {
    await handleSubscriptionConfirmation(envelope);
    return new Response("OK", { status: 200 });
  }
  if (messageType === "UnsubscribeConfirmation") {
    return new Response("OK", { status: 200 });
  }

  try {
    await dbConnect();
  } catch (err) {
    console.error("[whatsapp-webhook] dbConnect failed:", err);
    return new Response("OK", { status: 200 });
  }

  // Detect payload variant:
  //   - SNS envelope: top-level has Type=Notification + Message string
  //   - Meta direct: top-level has object="whatsapp_business_account" + entry array
  const isSnsEnvelope = envelope.Type === "Notification" && typeof envelope.Message === "string";
  let payload: MetaPayload | null = null;
  let phoneNumberIdFromAws: string | undefined;

  if (isSnsEnvelope) {
    const innerMessage = envelope.Message;
    if (!innerMessage) return new Response("OK", { status: 200 });
    console.log("[whatsapp-webhook] inner Message:", innerMessage.slice(0, 4000));
    const extracted = extractMetaPayload(innerMessage);
    if (!extracted) {
      console.warn("[whatsapp-webhook] Could not extract meta payload from SNS envelope");
      return new Response("OK", { status: 200 });
    }
    payload = extracted.payload;
    phoneNumberIdFromAws = extracted.phoneNumberId;
  } else {
    // Meta direct webhook
    payload = parsedBody as MetaPayload;
    if (!Array.isArray(payload.entry)) {
      console.warn("[whatsapp-webhook] Direct Meta payload missing entry[]");
      return new Response("OK", { status: 200 });
    }
  }

  console.log("[whatsapp-webhook] processing entries:", payload.entry?.length || 0, "via", isSnsEnvelope ? "SNS" : "Meta-direct");

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) {
        console.log("[whatsapp-webhook] change has no value, field:", change.field);
        continue;
      }

      const phoneNumberId = phoneNumberIdFromAws || value.metadata?.phone_number_id || entry.id;
      const contact = value.contacts?.[0];
      const profileName = contact?.profile?.name;

      console.log(
        "[whatsapp-webhook] change field:",
        change.field,
        "phoneNumberId:",
        phoneNumberId,
        "messages:",
        value.messages?.length || 0,
        "statuses:",
        value.statuses?.length || 0
      );

      for (const status of value.statuses || []) {
        const errs = (status.errors || []).map(
          (e) => `${e.code}:${e.title}${e.message ? ` (${e.message})` : ""}${e.error_data?.details ? ` [${e.error_data.details}]` : ""}`
        );
        console.log(
          `[whatsapp-webhook] delivery status id=${status.id} status=${status.status} recipient=${status.recipient_id}${errs.length ? " errors=" + errs.join("; ") : ""}`
        );
      }

      for (const msg of value.messages || []) {
        const from = msg.from;
        if (!from) continue;

        const text = extractTextFromMetaMessage(msg);
        console.log(
          `[whatsapp-webhook] inbound from=${from} type=${msg.type} text=${text.slice(0, 200)}`
        );
        try {
          await processInboundMessage(phoneNumberId, from, profileName, text, msg.id, msg);
        } catch (err) {
          console.error("[whatsapp-webhook] processInboundMessage failed:", err);
        }
      }
    }
  }

  return new Response("OK", { status: 200 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Meta webhook URL verification handshake
  if (mode === "subscribe" && challenge) {
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (expected && token === expected) {
      console.log("[whatsapp-webhook] Meta webhook verification SUCCESS");
      return new Response(challenge, { status: 200 });
    }
    console.warn("[whatsapp-webhook] Meta webhook verification FAILED — token mismatch");
    return new Response("Forbidden", { status: 403 });
  }

  return new Response("WhatsApp webhook is live", { status: 200 });
}
