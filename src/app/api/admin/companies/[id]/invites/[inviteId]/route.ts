import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { Invite } from "@/models/invite";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    await requireAdmin();
    await dbConnect();
    const { id, inviteId } = await params;

    const invite = await Invite.findOne({ _id: inviteId, companyId: id });
    if (!invite) return new Response("Not found", { status: 404 });

    invite.revokedAt = new Date();
    await invite.save();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE invite]", err);
    return new Response("Internal error", { status: 500 });
  }
}
