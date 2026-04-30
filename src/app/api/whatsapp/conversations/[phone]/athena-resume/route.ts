import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { Lead } from "@/models/lead";
import { runAthena } from "@/lib/whatsapp/athena";
import { sendWhatsAppText, normalizePhone } from "@/lib/whatsapp/send";

export const dynamic = "force-dynamic";

type StoredSignal = { rule: string; delta: number; evidence: string; timestamp: Date };

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    const { phone } = await params;
    const waPhone = normalizePhone(decodeURIComponent(phone));

    const conversation = await WhatsAppConversation.findOne({
      userId: user._id,
      waPhone,
    });
    if (!conversation) return new Response("Not found", { status: 404 });

    if (conversation.status === "human_handoff") {
      return new Response(
        "Conversation is in human handoff — release to bot before resuming Athena.",
        { status: 400 }
      );
    }

    const botConfig = await WhatsAppBotConfig.findOne({ userId: user._id });
    if (!botConfig || !botConfig.originationIdentity) {
      return new Response("Bot is not configured (missing originationIdentity).", { status: 400 });
    }

    const existingLead = await Lead.findOne({
      userId: user._id,
      conversationId: conversation._id,
    });
    const priorSignals: StoredSignal[] =
      (existingLead?.signals || []) as StoredSignal[];

    const athena = await runAthena(conversation, botConfig, priorSignals, {
      resume: true,
    });

    if (!athena.reply) {
      return new Response("Athena returned no reply.", { status: 502 });
    }

    try {
      const sendResult = await sendWhatsAppText({
        originationIdentity: botConfig.originationIdentity,
        toPhone: waPhone,
        text: athena.reply,
      });
      console.log(
        `[athena-resume] sent OK to=${waPhone} messageId=${sendResult.messageId || "?"}`
      );
    } catch (err) {
      console.error("[athena-resume] send failed:", err);
      return new Response(
        "Athena generated a reply but the WhatsApp send failed. Check Vercel logs.",
        { status: 502 }
      );
    }

    conversation.messages.push({
      role: "bot",
      content: athena.reply,
      timestamp: new Date(),
    });
    conversation.lastBotMessageAt = new Date();
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = athena.reply.slice(0, 120);
    if (athena.language) conversation.language = athena.language;

    // Merge new signals (dedupe by rule)
    const emittedRules = new Set(priorSignals.map((s) => s.rule));
    const uniqueNewSignals = (athena.newSignals || []).filter(
      (s) => s.rule && !emittedRules.has(s.rule)
    );

    if ((athena.qualified && athena.leadData) || uniqueNewSignals.length > 0) {
      const allSignals = [
        ...priorSignals,
        ...uniqueNewSignals.map((s) => ({
          rule: s.rule,
          delta: s.delta,
          evidence: s.evidence,
          timestamp: new Date(),
        })),
      ];
      const signalSum = allSignals.reduce((acc, s) => acc + (s.delta || 0), 0);
      const computedScore = Math.max(0, Math.min(100, 40 + signalSum));
      const computedTemp =
        computedScore >= 70 ? "hot" : computedScore >= 45 ? "warm" : "cold";

      conversation.temperature = computedTemp;

      const ctx = athena.patientContext || {};
      const leadPayload = {
        userId: user._id,
        conversationId: conversation._id,
        waPhone,
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

    await conversation.save();

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("[POST /api/whatsapp/.../athena-resume]", err);
    return new Response("Internal error", { status: 500 });
  }
}
