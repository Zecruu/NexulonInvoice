import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";
import { normalizePhone } from "@/lib/whatsapp/send";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    const { phone } = await params;
    const waPhone = normalizePhone(decodeURIComponent(phone));
    const body = await req.json().catch(() => ({}));
    const action: "take" | "release" = body.action === "release" ? "release" : "take";
    const reason: string | undefined = typeof body.reason === "string" ? body.reason : undefined;

    const conversation = await WhatsAppConversation.findOne({
      userId: user._id,
      waPhone,
    });
    if (!conversation) return new Response("Not found", { status: 404 });

    if (action === "take") {
      conversation.status = "human_handoff";
      conversation.handoffReason = reason || "Manually taken over";
    } else {
      conversation.status = "active";
      conversation.handoffReason = undefined;
    }

    await conversation.save();
    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("[POST /api/whatsapp/.../handoff]", err);
    return new Response("Internal error", { status: 500 });
  }
}
