import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { Lead } from "@/models/lead";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const temperature = searchParams.get("temperature");
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = { userId: user._id };
    if (temperature) filter.temperature = temperature;
    if (status) filter.status = status;

    const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    return NextResponse.json({ leads });
  } catch (err) {
    console.error("[GET /api/whatsapp/leads]", err);
    return new Response("Internal error", { status: 500 });
  }
}
