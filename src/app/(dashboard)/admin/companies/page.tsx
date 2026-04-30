import Link from "next/link";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { isAdmin } from "@/lib/admin";
import { Company } from "@/models/company";
import { User } from "@/models/user";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";
import { Lead } from "@/models/lead";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2 } from "lucide-react";
import { CreateCompanyButton } from "@/components/admin/create-company-button";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) redirect("/dashboard");

  await dbConnect();
  const companies = await Company.find().sort({ createdAt: -1 }).lean();

  const enriched = await Promise.all(
    companies.map(async (c) => {
      const [memberCount, botCount, conversationCount, leadCount] =
        await Promise.all([
          User.countDocuments({ companyId: c._id }),
          WhatsAppBotConfig.countDocuments({ companyId: c._id }),
          WhatsAppConversation.countDocuments({ companyId: c._id }),
          Lead.countDocuments({ companyId: c._id }),
        ]);
      return { ...c, memberCount, botCount, conversationCount, leadCount };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">
            Each company is an isolated tenant — its own bot, conversations, and members.
          </p>
        </div>
        <CreateCompanyButton />
      </div>

      {enriched.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No companies yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Company ID</th>
                <th className="px-4 py-2 font-medium">Members</th>
                <th className="px-4 py-2 font-medium">Bots</th>
                <th className="px-4 py-2 font-medium">Convos</th>
                <th className="px-4 py-2 font-medium">Leads</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {enriched.map((c) => (
                <tr key={String(c._id)} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.companyId}</td>
                  <td className="px-4 py-3">{c.memberCount}</td>
                  <td className="px-4 py-3">{c.botCount}</td>
                  <td className="px-4 py-3">{c.conversationCount}</td>
                  <td className="px-4 py-3">{c.leadCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/companies/${String(c._id)}`}>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
