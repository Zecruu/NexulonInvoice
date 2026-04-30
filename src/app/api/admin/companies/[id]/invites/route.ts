import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { Company } from "@/models/company";
import { Invite } from "@/models/invite";
import { User } from "@/models/user";
import { sendEmail, buildInviteEmail } from "@/lib/email";
import { getCurrentUser } from "@/lib/get-user";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const inviter = await getCurrentUser();
    await dbConnect();
    const { id } = await params;

    const company = await Company.findById(id);
    if (!company) return new Response("Company not found", { status: 404 });

    const body = await req.json();
    const email: string = (body.email || "").trim().toLowerCase();
    const role: "owner" | "admin" | "member" = ["owner", "admin", "member"].includes(body.role)
      ? body.role
      : "member";

    if (!email) return new Response("email required", { status: 400 });

    // Check if user already has a company
    const existingUser = await User.findOne({ email });
    if (existingUser?.companyId) {
      return new Response(
        `${email} already belongs to a company. Remove them from their current company first.`,
        { status: 400 }
      );
    }

    // Revoke any existing pending invites for the same email + company
    await Invite.updateMany(
      {
        companyId: company._id,
        email,
        acceptedAt: { $exists: false },
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date() } }
    );

    const invite = await Invite.create({
      companyId: company._id,
      email,
      role,
      invitedByUserId: inviter._id,
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://invoice.nexulonllc.com";
    const acceptUrl = `${baseUrl}/onboarding?invite=${invite.token}`;

    const inviterName =
      [inviter.firstName, inviter.lastName].filter(Boolean).join(" ") || inviter.email;

    const { subject, html, text } = buildInviteEmail({
      companyName: company.name,
      inviterName,
      acceptUrl,
      expiresAt: invite.expiresAt,
    });

    const emailResult = await sendEmail({ to: email, subject, html, text });

    return NextResponse.json({
      invite: JSON.parse(JSON.stringify(invite.toObject())),
      acceptUrl,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    });
  } catch (err) {
    console.error("[POST /api/admin/companies/:id/invites]", err);
    return new Response("Internal error", { status: 500 });
  }
}
