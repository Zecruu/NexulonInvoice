import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { BotTemplate, DEFAULT_ACCU_SPINA_TEMPLATE } from "@/models/bot-template";

export const dynamic = "force-dynamic";

async function ensureDefaultTemplate() {
  const existing = await BotTemplate.findOne({
    slug: DEFAULT_ACCU_SPINA_TEMPLATE.slug,
  });
  if (!existing) {
    await BotTemplate.create(DEFAULT_ACCU_SPINA_TEMPLATE);
  }
}

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();
    await ensureDefaultTemplate();

    const templates = await BotTemplate.find().sort({ isBuiltIn: -1, createdAt: 1 }).lean();
    return NextResponse.json({ templates: JSON.parse(JSON.stringify(templates)) });
  } catch (err) {
    console.error("[GET /api/admin/templates]", err);
    return new Response("Internal error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    await dbConnect();

    const body = await req.json();
    const name: string = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return new Response("name required", { status: 400 });

    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "template";
    let slug = baseSlug;
    let n = 1;
    while (await BotTemplate.findOne({ slug })) {
      slug = `${baseSlug}-${++n}`;
    }

    const template = await BotTemplate.create({
      name,
      slug,
      description: body.description || "",
      category: body.category || "general",
      botName: body.botName || "Athena",
      systemPromptAddendum: body.systemPromptAddendum || "",
      qualificationCriteria: body.qualificationCriteria || "",
      handoffKeywords: Array.isArray(body.handoffKeywords) ? body.handoffKeywords : [],
      autoHandoffOnFrustration: body.autoHandoffOnFrustration !== false,
      autoHandoffOnPricingObjection: body.autoHandoffOnPricingObjection === true,
      isBuiltIn: false,
    });

    return NextResponse.json({ template: JSON.parse(JSON.stringify(template.toObject())) });
  } catch (err) {
    console.error("[POST /api/admin/templates]", err);
    return new Response("Internal error", { status: 500 });
  }
}
