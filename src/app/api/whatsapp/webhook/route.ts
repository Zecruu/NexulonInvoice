import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { Lead } from "@/models/lead";
import { runAthena } from "@/lib/whatsapp/athena";
import { sendWhatsAppText, normalizePhone } from "@/lib/whatsapp/send";

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
  statuses?: Array<{ id?: string; status?: string; recipient_id?: string }>;
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
  aws?: {
    phoneNumber?: string;
    phoneNumberId?: string;
    configurationSetName?: string;
  };
  whatsAppWebhookEntry?: MetaPayload;
  webhookEntry?: MetaPayload;
}

function extractMetaPayload(
  message: string
): { payload: MetaPayload; phoneNumberId?: string } | null {
  try {
    const parsed = JSON.parse(message) as AwsSocialMessagingPayload | MetaPayload;

    if ("whatsAppWebhookEntry" in parsed && parsed.whatsAppWebhookEntry) {
      return {
        payload: parsed.whatsAppWebhookEntry,
        phoneNumberId: parsed.aws?.phoneNumberId,
      };
    }
    if ("webhookEntry" in parsed && parsed.webhookEntry) {
      return {
        payload: parsed.webhookEntry,
        phoneNumberId: (parsed as AwsSocialMessagingPayload).aws?.phoneNumberId,
      };
    }
    if ("entry" in parsed) {
      return { payload: parsed as MetaPayload };
    }
    return null;
  } catch {
    return null;
  }
}

function extractTextFromMetaMessage(msg: NonNullable<MetaValue["messages"]>[number]): string {
  if (msg.text?.body) return msg.text.body;
  if (msg.button?.text) return msg.button.text;
  if (msg.interactive?.button_reply?.title) return msg.interactive.button_reply.title;
  if (msg.interactive?.list_reply?.title) return msg.interactive.list_reply.title;
  if (msg.type === "image") return "[image]";
  if (msg.type === "audio") return "[audio]";
  if (msg.type === "document") return `[document: ${msg.document?.filename || ""}]`;
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
  waMessageId: string | undefined
): Promise<void> {
  const botConfig = phoneNumberId
    ? await WhatsAppBotConfig.findOne({ phoneNumberId })
    : null;

  if (!botConfig) {
    console.warn(
      `[whatsapp-webhook] No bot config for phoneNumberId=${phoneNumberId}. Skipping.`
    );
    return;
  }

  const normPhone = normalizePhone(customerPhone);

  let conversation = await WhatsAppConversation.findOne({
    userId: botConfig.userId,
    waPhone: normPhone,
  });

  if (!conversation) {
    conversation = await WhatsAppConversation.create({
      userId: botConfig.userId,
      waPhone: normPhone,
      profileName,
      status: "active",
      language: "en",
      temperature: "unknown",
      unread: true,
      unreadCount: 0,
      messages: [],
      lastMessagePreview: "",
      lastMessageAt: new Date(),
    });
  } else if (profileName && !conversation.profileName) {
    conversation.profileName = profileName;
  }

  conversation.messages.push({
    role: "customer",
    content: messageText,
    waMessageId,
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

  const athena = await runAthena(conversation, botConfig);

  if (athena.shouldHandoff) {
    conversation.status = "human_handoff";
    conversation.handoffReason = athena.handoffReason;
  } else if (athena.qualified && athena.leadData) {
    conversation.temperature = athena.temperature === "unknown" ? "warm" : athena.temperature;
    conversation.qualificationNotes = athena.leadData.summary;

    const existingLead = await Lead.findOne({
      userId: botConfig.userId,
      conversationId: conversation._id,
    });

    const leadPayload = {
      userId: botConfig.userId,
      conversationId: conversation._id,
      waPhone: normPhone,
      name: athena.leadData.name,
      temperature: (athena.temperature === "unknown" ? "warm" : athena.temperature) as
        | "hot"
        | "warm"
        | "cold",
      painDuration: athena.leadData.painDuration,
      diagnosis: athena.leadData.diagnosis,
      urgency: athena.leadData.urgency,
      hasInsurance: athena.leadData.hasInsurance,
      location: athena.leadData.location,
      summary: athena.leadData.summary,
      score: athena.leadData.score ?? 0,
    };

    if (existingLead) {
      Object.assign(existingLead, leadPayload);
      await existingLead.save();
    } else {
      await Lead.create(leadPayload);
    }
  }

  conversation.language = athena.language;

  try {
    await sendWhatsAppText({
      originationIdentity: botConfig.originationIdentity,
      toPhone: normPhone,
      text: athena.reply,
    });

    conversation.messages.push({
      role: "bot",
      content: athena.reply,
      timestamp: new Date(),
    });
    conversation.lastBotMessageAt = new Date();
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = athena.reply.slice(0, 120);
  } catch (err) {
    console.error("[whatsapp-webhook] send failed:", err);
  }

  await conversation.save();
}

export async function POST(req: NextRequest) {
  const messageType = req.headers.get("x-amz-sns-message-type");
  const rawBody = await req.text();

  let envelope: SnsEnvelope;
  try {
    envelope = JSON.parse(rawBody) as SnsEnvelope;
  } catch {
    return new Response("Invalid JSON", { status: 200 });
  }

  if (messageType === "SubscriptionConfirmation" || envelope.Type === "SubscriptionConfirmation") {
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

  const innerMessage = envelope.Message;
  if (!innerMessage) {
    return new Response("OK", { status: 200 });
  }

  const extracted = extractMetaPayload(innerMessage);
  if (!extracted) {
    console.warn("[whatsapp-webhook] Could not extract meta payload");
    return new Response("OK", { status: 200 });
  }

  const { payload, phoneNumberId: awsPhoneNumberId } = extracted;

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      const phoneNumberId = awsPhoneNumberId || value.metadata?.phone_number_id || entry.id;
      const contact = value.contacts?.[0];
      const profileName = contact?.profile?.name;

      for (const msg of value.messages || []) {
        const from = msg.from;
        if (!from) continue;

        const text = extractTextFromMetaMessage(msg);
        try {
          await processInboundMessage(phoneNumberId, from, profileName, text, msg.id);
        } catch (err) {
          console.error("[whatsapp-webhook] processInboundMessage failed:", err);
        }
      }
    }
  }

  return new Response("OK", { status: 200 });
}

export async function GET() {
  return new Response("WhatsApp webhook is live", { status: 200 });
}
