import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { BotTemplate } from "@/models/bot-template";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    await dbConnect();

    const { id } = await params;
    const template = await BotTemplate.findById(id);
    if (!template) return new Response("Not found", { status: 404 });
    return NextResponse.json({ template: JSON.parse(JSON.stringify(template.toObject())) });
  } catch (err) {
    console.error("[GET /api/admin/templates/:id]", err);
    return new Response("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    await dbConnect();

    const { id } = await params;
    const body = await req.json();

    const template = await BotTemplate.findById(id);
    if (!template) return new Response("Not found", { status: 404 });

    const editable = [
      "name",
      "description",
      "category",
      "botName",
      "systemPromptAddendum",
      "qualificationCriteria",
      "handoffKeywords",
      "autoHandoffOnFrustration",
      "autoHandoffOnPricingObjection",
    ] as const;
    for (const key of editable) {
      if (key in body) {
        (template as unknown as Record<string, unknown>)[key] = body[key];
      }
    }
    await template.save();
    return NextResponse.json({ template: JSON.parse(JSON.stringify(template.toObject())) });
  } catch (err) {
    console.error("[PATCH /api/admin/templates/:id]", err);
    return new Response("Internal error", { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    await dbConnect();

    const { id } = await params;
    const template = await BotTemplate.findById(id);
    if (!template) return new Response("Not found", { status: 404 });
    if (template.isBuiltIn) {
      return new Response("Cannot delete built-in templates", { status: 400 });
    }
    await template.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/templates/:id]", err);
    return new Response("Internal error", { status: 500 });
  }
}
