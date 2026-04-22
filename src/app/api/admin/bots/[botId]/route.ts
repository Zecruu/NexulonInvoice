import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { User } from "@/models/user";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    await requireAdmin();
    await dbConnect();

    const { botId } = await params;
    const bot = await WhatsAppBotConfig.findOne({ botId }).populate({
      path: "userId",
      select: "email firstName lastName businessName",
      model: User,
    });
    if (!bot) return new Response("Not found", { status: 404 });

    return NextResponse.json({ bot: JSON.parse(JSON.stringify(bot.toObject())) });
  } catch (err) {
    console.error("[GET /api/admin/bots/:botId]", err);
    return new Response("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    await requireAdmin();
    await dbConnect();

    const { botId } = await params;
    const body = await req.json();

    const bot = await WhatsAppBotConfig.findOne({ botId });
    if (!bot) return new Response("Not found", { status: 404 });

    const editableFields = [
      "enabled",
      "botName",
      "businessName",
      "phoneNumberId",
      "originationIdentity",
      "systemPromptAddendum",
      "qualificationCriteria",
      "handoffKeywords",
      "autoHandoffOnFrustration",
      "autoHandoffOnPricingObjection",
      "bookingUrl",
    ] as const;

    for (const key of editableFields) {
      if (key in body) {
        (bot as unknown as Record<string, unknown>)[key] = body[key];
      }
    }

    await bot.save();
    return NextResponse.json({ bot: JSON.parse(JSON.stringify(bot.toObject())) });
  } catch (err) {
    console.error("[PATCH /api/admin/bots/:botId]", err);
    return new Response("Internal error", { status: 500 });
  }
}
