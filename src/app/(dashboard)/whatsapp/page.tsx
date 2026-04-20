import Link from "next/link";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Settings2, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

function tempColor(t: string): "default" | "secondary" | "destructive" | "outline" {
  if (t === "hot") return "destructive";
  if (t === "warm") return "default";
  if (t === "cold") return "secondary";
  return "outline";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    active: "Bot active",
    human_handoff: "Human handoff",
    qualified: "Qualified",
    unqualified: "Unqualified",
    resolved: "Resolved",
    expired: "Expired",
  };
  return map[status] || status;
}

export default async function WhatsAppPage() {
  const user = await getCurrentUser();
  await dbConnect();

  const conversations = await WhatsAppConversation.find({ userId: user._id })
    .sort({ lastMessageAt: -1 })
    .limit(200)
    .select(
      "waPhone profileName customerName status language temperature unread unreadCount lastMessageAt lastMessagePreview handoffReason"
    )
    .lean();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Conversations with Athena, your AI lead-qualifier for Accu-Spina.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/whatsapp/leads">
            <Button variant="outline" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              Leads
            </Button>
          </Link>
          <Link href="/whatsapp/config">
            <Button variant="outline" size="sm">
              <Settings2 className="mr-2 h-4 w-4" />
              Bot Config
            </Button>
          </Link>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-sm font-medium">No conversations yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Once someone messages your WhatsApp business number, conversations with
            Athena will appear here.
          </p>
          <Link href="/whatsapp/config" className="mt-4 inline-block">
            <Button size="sm" variant="default">
              Configure bot
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <ul className="divide-y">
            {conversations.map((c) => {
              const id = String(c._id);
              const phoneEnc = encodeURIComponent(c.waPhone);
              return (
                <li key={id}>
                  <Link
                    href={`/whatsapp/${phoneEnc}`}
                    className="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {c.customerName || c.profileName || c.waPhone}
                        </p>
                        {c.unread && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {c.lastMessageAt
                            ? formatDistanceToNow(new Date(c.lastMessageAt), {
                                addSuffix: true,
                              })
                            : ""}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {c.lastMessagePreview || "(no messages)"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={tempColor(c.temperature)} className="text-[10px]">
                          {c.temperature}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {statusLabel(c.status)}
                        </Badge>
                        <span className="text-[11px] uppercase text-muted-foreground">
                          {c.language}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
