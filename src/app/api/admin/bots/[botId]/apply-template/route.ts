import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { BotTemplate } from "@/models/bot-template";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    await requireAdmin();
    await dbConnect();

    const { botId } = await params;
    const body = await req.json();
    const templateId: string = body.templateId;
    if (!templateId) return new Response("templateId required", { status: 400 });

    const [bot, template] = await Promise.all([
      WhatsAppBotConfig.findOne({ botId }),
      BotTemplate.findById(templateId),
    ]);
    if (!bot) return new Response("Bot not found", { status: 404 });
    if (!template) return new Response("Template not found", { status: 404 });

    bot.botName = template.botName || bot.botName;
    bot.systemPromptAddendum = template.systemPromptAddendum;
    bot.qualificationCriteria = template.qualificationCriteria;
    bot.handoffKeywords = [...template.handoffKeywords];
    bot.autoHandoffOnFrustration = template.autoHandoffOnFrustration;
    bot.autoHandoffOnPricingObjection = template.autoHandoffOnPricingObjection;
    bot.templateId = template._id as typeof bot.templateId;

    await bot.save();

    return NextResponse.json({
      bot: JSON.parse(JSON.stringify(bot.toObject())),
    });
  } catch (err) {
    console.error("[POST /api/admin/bots/:botId/apply-template]", err);
    return new Response("Internal error", { status: 500 });
  }
}
