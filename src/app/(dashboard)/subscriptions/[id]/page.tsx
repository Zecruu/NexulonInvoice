import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubscriptionById } from "@/actions/subscription-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { SubscriptionActions } from "@/components/subscriptions/subscription-actions";

export const dynamic = "force-dynamic";

export default async function SubscriptionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSubscriptionById(id);
  if (!data) notFound();
  const { subscription: s, relatedInvoices } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/subscriptions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              {s.label || `${s.clientId?.name || "Subscription"}`}
            </h1>
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
          </div>
          <p className="text-sm text-muted-foreground capitalize">
            {s.frequency} · {formatCurrency(s.total, s.currency)} per cycle
          </p>
        </div>
        <SubscriptionActions id={id} status={s.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Next invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {s.status === "active" ? formatDate(s.nextRunAt) : "Paused"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Last invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {s.lastRunAt ? formatDate(s.lastRunAt) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Total generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {s.invoicesGenerated} invoice
              {s.invoicesGenerated === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span>
                {s.clientId?.name} <span className="text-muted-foreground">{s.clientId?.email}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auto-send</span>
              <span>{s.autoSend ? "Yes (email on each cycle)" : "No (you send manually)"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due in</span>
              <span>{s.dueDays} day{s.dueDays === 1 ? "" : "s"} after issue</span>
            </div>
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Line items
              </p>
              <ul className="space-y-1.5">
                {s.lineItems.map(
                  (
                    li: { description: string; quantity: number; unitPrice: number; amount: number },
                    i: number
                  ) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {li.description}{" "}
                        <span className="text-muted-foreground">×{li.quantity}</span>
                      </span>
                      <span className="font-mono">
                        {formatCurrency(li.amount, s.currency)}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </div>
            <div className="flex justify-between border-t pt-3 font-semibold">
              <span>Total per cycle</span>
              <span className="font-mono">{formatCurrency(s.total, s.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {relatedInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Invoice history ({relatedInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Number</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Issued</th>
                  <th className="px-4 py-2 font-medium">Due</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {relatedInvoices.map(
                  (inv: {
                    _id: string;
                    invoiceNumber: string;
                    status: string;
                    issueDate: string;
                    dueDate: string;
                    total: number;
                    currency: string;
                  }) => (
                    <tr key={inv._id} className="hover:bg-accent/30">
                      <td className="px-4 py-2">
                        <Link
                          href={`/invoices/${inv._id}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-[10px]">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {formatDate(inv.issueDate)}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
