import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { Company } from "@/models/company";
import { Invite } from "@/models/invite";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    await dbConnect();

    if (user.companyId) {
      return new Response("You already belong to a company", { status: 400 });
    }

    const body = await req.json();
    const companyId: string = (body.companyId || "").trim();
    if (!companyId) return new Response("companyId required", { status: 400 });

    const company = await Company.findOne({ companyId });
    if (!company) {
      return new Response(
        "Company ID not recognized. Double-check with your admin.",
        { status: 404 }
      );
    }

    // Verify the user has a pending, valid invite for THIS company
    const invite = await Invite.findOne({
      companyId: company._id,
      email: user.email.toLowerCase(),
      acceptedAt: { $exists: false },
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return new Response(
        `No pending invite found for ${user.email} in ${company.name}. Ask the admin to send you an invite.`,
        { status: 403 }
      );
    }

    user.companyId = company._id as typeof user.companyId;
    user.companyRole = invite.role;
    user.joinedCompanyAt = new Date();
    await user.save();

    invite.acceptedAt = new Date();
    invite.acceptedByUserId = user._id as typeof invite.acceptedByUserId;
    await invite.save();

    return NextResponse.json({
      success: true,
      companyId: String(company._id),
      companyName: company.name,
    });
  } catch (err) {
    console.error("[POST /api/onboarding/join-company]", err);
    return new Response("Internal error", { status: 500 });
  }
}
