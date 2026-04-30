import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { Company } from "@/models/company";
import { User } from "@/models/user";
import { Invite } from "@/models/invite";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    await dbConnect();
    const { id } = await params;

    const company = await Company.findById(id).lean();
    if (!company) return new Response("Not found", { status: 404 });

    const [members, invites] = await Promise.all([
      User.find({ companyId: id })
        .select("email firstName lastName companyRole joinedCompanyAt createdAt")
        .lean(),
      Invite.find({ companyId: id, acceptedAt: { $exists: false }, revokedAt: { $exists: false } })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return NextResponse.json({
      company: { ...company, _id: String(company._id) },
      members: members.map((m) => ({ ...m, _id: String(m._id) })),
      invites: invites.map((i) => ({ ...i, _id: String(i._id), companyId: String(i.companyId) })),
    });
  } catch (err) {
    console.error("[GET /api/admin/companies/:id]", err);
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

    const company = await Company.findById(id);
    if (!company) return new Response("Not found", { status: 404 });

    const editable = ["name", "brandLogo", "brandPrimaryColor"] as const;
    for (const k of editable) {
      if (k in body) (company as unknown as Record<string, unknown>)[k] = body[k];
    }
    await company.save();
    return NextResponse.json({ company: JSON.parse(JSON.stringify(company.toObject())) });
  } catch (err) {
    console.error("[PATCH /api/admin/companies/:id]", err);
    return new Response("Internal error", { status: 500 });
  }
}
