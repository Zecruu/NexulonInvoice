import Link from "next/link";
import { getSubscriptions } from "@/actions/subscription-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const subs = await getSubscriptions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Recurring invoice templates that auto-generate + auto-send each cycle.
          </p>
        </div>
        <Link href="/subscriptions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New subscription
          </Button>
        </Link>
      </div>

      {subs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Repeat className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No subscriptions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create one from scratch, or open an existing invoice and click <strong>Make recurring</strong>.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Frequency</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Next run</th>
                <th className="px-4 py-2 font-medium">Generated</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {subs.map((s: {
                _id: string;
                clientId: { name?: string; email?: string };
                frequency: string;
                total: number;
                currency: string;
                nextRunAt: string;
                invoicesGenerated: number;
                status: string;
                label?: string;
              }) => (
                <tr key={s._id} className="hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.clientId?.name || "—"}</p>
                    {s.label && (
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{s.frequency}</td>
                  <td className="px-4 py-3 font-mono">
                    {formatCurrency(s.total, s.currency)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {s.status === "active" ? formatDate(s.nextRunAt) : "—"}
                  </td>
                  <td className="px-4 py-3">{s.invoicesGenerated}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        s.status === "active"
                          ? "default"
                          : s.status === "paused"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/subscriptions/${s._id}`}>
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
