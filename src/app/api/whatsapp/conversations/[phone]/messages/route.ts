import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { sendWhatsAppText, normalizePhone } from "@/lib/whatsapp/send";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    const { phone } = await params;
    const waPhone = normalizePhone(decodeURIComponent(phone));
    const body = await req.json();
    const text: string = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) return new Response("Empty message", { status: 400 });

    const conversation = await WhatsAppConversation.findOne({
      userId: user._id,
      waPhone,
    });
    if (!conversation) return new Response("Not found", { status: 404 });

    const botConfig = await WhatsAppBotConfig.findOne({ userId: user._id });
    if (!botConfig || !botConfig.originationIdentity) {
      return new Response("Bot not configured", { status: 400 });
    }

    await sendWhatsAppText({
      originationIdentity: botConfig.originationIdentity,
      toPhone: waPhone,
      text,
    });

    conversation.messages.push({
      role: "human",
      content: text,
      timestamp: new Date(),
    });
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = text.slice(0, 120);
    if (conversation.status === "active") {
      conversation.status = "human_handoff";
      conversation.handoffReason = conversation.handoffReason || "Human sent reply";
    }
    await conversation.save();

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("[POST /api/whatsapp/conversations/:phone/messages]", err);
    return new Response("Internal error", { status: 500 });
  }
}
