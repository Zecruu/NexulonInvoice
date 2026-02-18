import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/invoices/status-badge";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { getInvoiceById } from "@/actions/invoice-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ClientType } from "@/types";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) notFound();

  const client = invoice.clientId as ClientType;

  return (
    <div className="space-y-6">
      <PageHeader title={`Invoice ${invoice.invoiceNumber}`}>
        <div className="flex items-center gap-2">
          <StatusBadge status={invoice.status} />
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Link href={`/invoices/${invoiceId}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          <InvoiceActions invoice={invoice} />
        </div>
      </PageHeader>

      {/* Invoice Document */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <div>
              <h2 className="text-2xl font-bold">INVOICE</h2>
              <p className="text-muted-foreground">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p>
                <span className="text-muted-foreground">Issue Date: </span>
                {formatDate(invoice.issueDate)}
              </p>
              <p>
                <span className="text-muted-foreground">Due Date: </span>
                {formatDate(invoice.dueDate)}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Bill To */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Bill To
            </p>
            <p className="font-semibold">{client.name}</p>
            <p className="text-sm text-muted-foreground">{client.email}</p>
            {client.address?.street && (
              <div className="mt-1 text-sm text-muted-foreground">
                <p>{client.address.street}</p>
                <p>
                  {[client.address.city, client.address.state, client.address.zipCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Line Items */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Unit Price</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map(
                  (
                    item: {
                      description: string;
                      quantity: number;
                      unitPrice: number;
                      amount: number;
                    },
                    i: number
                  ) => (
                    <tr key={i} className="border-b">
                      <td className="py-3">{item.description}</td>
                      <td className="py-3 text-right">{item.quantity}</td>
                      <td className="py-3 text-right">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="ml-auto mt-6 w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax ({invoice.taxRate}%)
                </span>
                <span>{formatCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-green-600">
                  -{formatCurrency(invoice.discountAmount)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <>
              <Separator className="my-6" />
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Notes
                </p>
                <p className="text-sm">{invoice.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span>Created on {formatDate(invoice.createdAt)}</span>
            </div>
            {invoice.sentAt && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span>Sent on {formatDate(invoice.sentAt)}</span>
              </div>
            )}
            {invoice.viewedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-yellow-500" />
                <span>Viewed on {formatDate(invoice.viewedAt)}</span>
              </div>
            )}
            {invoice.paidAt && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Paid on {formatDate(invoice.paidAt)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
