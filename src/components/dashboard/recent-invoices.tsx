import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/invoices/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceType, ClientType } from "@/types";

interface RecentInvoicesProps {
  invoices: (InvoiceType & { clientId: ClientType })[];
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Invoices</CardTitle>
        <Link
          href="/invoices"
          className="text-sm text-muted-foreground hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No invoices yet. Create your first invoice to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <Link
                key={invoice._id}
                href={`/invoices/${invoice._id}`}
                className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {typeof invoice.clientId === "object"
                        ? invoice.clientId.name
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={invoice.status} />
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(invoice.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(invoice.createdAt)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
