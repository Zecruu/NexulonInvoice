import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { getOrCreateBotConfig } from "@/lib/whatsapp/bot-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    const config = await getOrCreateBotConfig(user);
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

    const config = await getOrCreateBotConfig(user);

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
