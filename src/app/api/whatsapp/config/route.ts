import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    let config = await WhatsAppBotConfig.findOne({ userId: user._id });
    if (!config) {
      config = await WhatsAppBotConfig.create({ userId: user._id });
    }
    return NextResponse.json({ config });
  } catch (err) {
    console.error("[GET /api/whatsapp/config]", err);
    return new Response("Internal error", { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    const body = await req.json();

    let config = await WhatsAppBotConfig.findOne({ userId: user._id });
    if (!config) {
      config = await WhatsAppBotConfig.create({ userId: user._id });
    }

    const fields = [
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

    for (const key of fields) {
      if (key in body) {
        (config as unknown as Record<string, unknown>)[key] = body[key];
      }
    }

    await config.save();
    return NextResponse.json({ config });
  } catch (err) {
    console.error("[PATCH /api/whatsapp/config]", err);
    return new Response("Internal error", { status: 500 });
  }
}
