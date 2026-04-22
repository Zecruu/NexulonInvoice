import Link from "next/link";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { isAdmin } from "@/lib/admin";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { User } from "@/models/user";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot, BookTemplate } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminBotsPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) redirect("/dashboard");

  await dbConnect();
  const bots = await WhatsAppBotConfig.find()
    .populate({ path: "userId", select: "email firstName lastName businessName", model: User })
    .sort({ createdAt: -1 })
    .lean();

  const userIds = bots
    .map((b) => (b.userId as unknown as { _id?: unknown } | null)?._id)
    .filter(Boolean);

  const conversationCounts = await WhatsAppConversation.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(
    conversationCounts.map((c) => [String(c._id), c.count as number])
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
          <h1 className="text-2xl font-bold tracking-tight">Bots</h1>
          <p className="text-sm text-muted-foreground">
            Manage WhatsApp bots across all accounts.
          </p>
        </div>
        <Link href="/admin/templates">
          <Button variant="outline" size="sm">
            <BookTemplate className="mr-2 h-4 w-4" />
            Templates
          </Button>
        </Link>
      </div>

      {bots.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Bot className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No bots yet. A bot is auto-created when a user first visits /whatsapp.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Bot ID</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">WABA Phone ID</th>
                <th className="px-4 py-2 font-medium">Conversations</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {bots.map((b) => {
                const u = b.userId as unknown as {
                  _id?: unknown;
                  email?: string;
                  firstName?: string;
                  lastName?: string;
                  businessName?: string;
                } | null;
                const name =
                  u?.businessName ||
                  [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
                  u?.email ||
                  "—";
                return (
                  <tr key={String(b._id)} className="hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">{u?.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{b.botId}</td>
                    <td className="px-4 py-3">
                      <Badge variant={b.enabled ? "default" : "secondary"}>
                        {b.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {b.phoneNumberId || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {countMap.get(String(u?._id)) || 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/bots/${b.botId}`}>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
