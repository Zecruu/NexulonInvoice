import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";
import { Lead } from "@/models/lead";
import { normalizePhone } from "@/lib/whatsapp/send";

export const dynamic = "force-dynamic";

export async function GET(
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
    }).lean();

    if (!conversation) {
      return new Response("Not found", { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("[GET /api/whatsapp/conversations/:phone]", err);
    return new Response("Internal error", { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    const { phone } = await params;
    const waPhone = normalizePhone(decodeURIComponent(phone));

    const conv = await WhatsAppConversation.findOne({ userId: user._id, waPhone });
    if (!conv) return new Response("Not found", { status: 404 });

    await Lead.deleteMany({ userId: user._id, conversationId: conv._id });
    await conv.deleteOne();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/whatsapp/conversations/:phone]", err);
    return new Response("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    const { phone } = await params;
    const waPhone = normalizePhone(decodeURIComponent(phone));
    const body = await req.json();

    const conversation = await WhatsAppConversation.findOne({
      userId: user._id,
      waPhone,
    });
    if (!conversation) return new Response("Not found", { status: 404 });

    if (body.markRead === true) {
      conversation.unread = false;
      conversation.unreadCount = 0;
    }
    if (typeof body.customerName === "string") {
      conversation.customerName = body.customerName;
    }
    if (typeof body.qualificationNotes === "string") {
      conversation.qualificationNotes = body.qualificationNotes;
    }
    if (
      body.status &&
      ["active", "human_handoff", "qualified", "unqualified", "resolved", "expired"].includes(
        body.status
      )
    ) {
      conversation.status = body.status;
    }

    await conversation.save();
    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("[PATCH /api/whatsapp/conversations/:phone]", err);
    return new Response("Internal error", { status: 500 });
  }
}
