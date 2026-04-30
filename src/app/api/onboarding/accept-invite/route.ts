import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { Invite } from "@/models/invite";
import { User } from "@/models/user";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    const body = await req.json();
    const token: string = (body.token || "").trim();
    if (!token) return new Response("token required", { status: 400 });

    const invite = await Invite.findOne({ token });
    if (!invite) return new Response("Invite not found", { status: 404 });
    if (invite.revokedAt) return new Response("Invite was revoked", { status: 400 });
    if (invite.acceptedAt) return new Response("Invite already accepted", { status: 400 });
    if (invite.expiresAt < new Date()) return new Response("Invite expired", { status: 400 });

    if (invite.email !== user.email.toLowerCase()) {
      return new Response(
        `This invite was sent to ${invite.email} but you're signed in as ${user.email}. Sign in with the correct account.`,
        { status: 403 }
      );
    }

    if (user.companyId) {
      return new Response("You already belong to a company", { status: 400 });
    }

    user.companyId = invite.companyId;
    user.companyRole = invite.role;
    user.joinedCompanyAt = new Date();
    await user.save();

    invite.acceptedAt = new Date();
    invite.acceptedByUserId = user._id as typeof invite.acceptedByUserId;
    await invite.save();

    return NextResponse.json({
      success: true,
      companyId: String(invite.companyId),
    });
  } catch (err) {
    console.error("[POST /api/onboarding/accept-invite]", err);
    return new Response("Internal error", { status: 500 });
  }
}
