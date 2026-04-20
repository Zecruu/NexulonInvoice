import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const temperature = searchParams.get("temperature");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

    const filter: Record<string, unknown> = { userId: user._id };
    if (status) filter.status = status;
    if (temperature) filter.temperature = temperature;

    const conversations = await WhatsAppConversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .select(
        "waPhone profileName customerName status language temperature unread unreadCount lastMessageAt lastMessagePreview handoffReason createdAt"
      )
      .lean();

    const unreadCount = await WhatsAppConversation.countDocuments({
      userId: user._id,
      unread: true,
    });

    return NextResponse.json({ conversations, unreadCount });
  } catch (err) {
    console.error("[GET /api/whatsapp/conversations]", err);
    return new Response("Internal error", { status: 500 });
  }
}
