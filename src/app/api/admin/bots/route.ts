import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { User } from "@/models/user";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();

    const bots = await WhatsAppBotConfig.find()
      .populate({ path: "userId", select: "email firstName lastName businessName", model: User })
      .sort({ createdAt: -1 })
      .lean();

    const botIds = bots.map((b) => b._id);
    const conversationCounts = await WhatsAppConversation.aggregate([
      { $match: { userId: { $in: bots.map((b) => b.userId?._id || b.userId) } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(
      conversationCounts.map((c) => [String(c._id), c.count])
    );

    const enriched = bots.map((b) => ({
      ...b,
      _id: String(b._id),
      userId: b.userId
        ? {
            _id: String(
              (b.userId as unknown as { _id: unknown })._id ?? b.userId
            ),
            email: (b.userId as unknown as { email?: string }).email,
            firstName: (b.userId as unknown as { firstName?: string }).firstName,
            lastName: (b.userId as unknown as { lastName?: string }).lastName,
            businessName: (b.userId as unknown as { businessName?: string })
              .businessName,
          }
        : null,
      conversationCount:
        countMap.get(
          String((b.userId as unknown as { _id?: unknown })?._id ?? b.userId)
        ) || 0,
      templateId: b.templateId ? String(b.templateId) : null,
    }));

    void botIds;
    return NextResponse.json({ bots: enriched });
  } catch (err) {
    console.error("[GET /api/admin/bots]", err);
    return new Response("Internal error", { status: 500 });
  }
}
