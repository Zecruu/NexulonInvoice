import Link from "next/link";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { Lead } from "@/models/lead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Flame, Snowflake, Thermometer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { LeadSignalsDialog } from "@/components/whatsapp/lead-signals-dialog";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const user = await getCurrentUser();
  await dbConnect();

  const leads = await Lead.find({ userId: user._id })
    .sort({ temperature: 1, createdAt: -1 })
    .limit(500)
    .lean();

  const hotCount = leads.filter((l) => l.temperature === "hot").length;
  const warmCount = leads.filter((l) => l.temperature === "warm").length;
  const coldCount = leads.filter((l) => l.temperature === "cold").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/whatsapp">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Qualified Leads</h1>
          <p className="text-sm text-muted-foreground">
            Leads Athena has qualified from WhatsApp conversations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-red-500" />
            Hot
          </div>
          <p className="mt-1 text-2xl font-bold">{hotCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Thermometer className="h-4 w-4 text-amber-500" />
            Warm
          </div>
          <p className="mt-1 text-2xl font-bold">{warmCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Snowflake className="h-4 w-4 text-sky-500" />
            Cold
          </div>
          <p className="mt-1 text-2xl font-bold">{coldCount}</p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No leads yet. They'll show up here once Athena qualifies them.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Name / Phone</th>
                <th className="px-4 py-2 font-medium">Temp</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Summary</th>
                <th className="px-4 py-2 font-medium">Score</th>
                <th className="px-4 py-2 font-medium">Signals</th>
                <th className="px-4 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((l) => (
                <tr key={String(l._id)} className="hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/whatsapp/${encodeURIComponent(l.waPhone)}`}
                      className="font-medium hover:underline"
                    >
                      {l.name || l.waPhone}
                    </Link>
                    {l.name && (
                      <p className="text-xs text-muted-foreground">{l.waPhone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        l.temperature === "hot"
                          ? "destructive"
                          : l.temperature === "warm"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {l.temperature}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{l.status}</Badge>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="line-clamp-2 text-muted-foreground">{l.summary}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={
                            l.score >= 70
                              ? "h-full bg-red-500"
                              : l.score >= 45
                              ? "h-full bg-amber-500"
                              : "h-full bg-sky-500"
                          }
                          style={{ width: `${Math.min(100, Math.max(0, l.score))}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs">{l.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <LeadSignalsDialog
                      name={l.name || l.waPhone}
                      score={l.score}
                      signals={(
                        (l.signals || []) as Array<{
                          rule: string;
                          delta: number;
                          evidence: string;
                          timestamp: Date | string;
                        }>
                      ).map((s) => ({
                        rule: s.rule,
                        delta: s.delta,
                        evidence: s.evidence,
                        timestamp: String(s.timestamp),
                      }))}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}
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
