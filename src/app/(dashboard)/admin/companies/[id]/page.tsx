import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { isAdmin } from "@/lib/admin";
import { Company } from "@/models/company";
import { User } from "@/models/user";
import { Invite } from "@/models/invite";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy } from "lucide-react";
import { CompanyDetailClient } from "@/components/admin/company-detail-client";
import { CompanyFeaturesToggle } from "@/components/admin/company-features-toggle";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) redirect("/dashboard");

  await dbConnect();

  const company = await Company.findById(id).lean();
  if (!company) notFound();

  const [members, invites] = await Promise.all([
    User.find({ companyId: id })
      .select("email firstName lastName companyRole joinedCompanyAt createdAt")
      .lean(),
    Invite.find({
      companyId: id,
      acceptedAt: { $exists: false },
      revokedAt: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/companies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
          <p className="text-sm text-muted-foreground">
            Company ID: <span className="font-mono">{company.companyId}</span>
          </p>
        </div>
      </div>

      <CompanyFeaturesToggle
        companyId={String(company._id)}
        initialInvoicesEnabled={Boolean(company.featuresEnabled?.invoices)}
      />

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Share with members
        </p>
        <p className="mt-1 text-sm">
          Members joining via Company ID can use:{" "}
          <span className="font-mono font-semibold">{company.companyId}</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          They&apos;ll also need a pending invite for their email — Company ID alone isn&apos;t
          enough.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Members ({members.length})</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No members yet.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={String(m._id)}>
                      <td className="px-3 py-2 font-medium">
                        {[m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">{m.email}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            m.companyRole === "owner"
                              ? "default"
                              : m.companyRole === "admin"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {m.companyRole || "member"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pending invites ({invites.length})</h2>
          <CompanyDetailClient
            companyId={String(company._id)}
            initialInvites={invites.map((i) => ({
              _id: String(i._id),
              email: i.email,
              role: i.role,
              token: i.token,
              expiresAt: i.expiresAt.toString(),
            }))}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Created {formatDate((company.createdAt as Date) || new Date())} ·{" "}
        Owner User ID:{" "}
        <span className="font-mono">{String(company.ownerUserId || "—")}</span>
      </p>
    </div>
  );
}
