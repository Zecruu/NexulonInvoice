import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PayButton } from "@/components/invoices/pay-button";
import dbConnect from "@/lib/db";
import { Invoice } from "@/models/invoice";
import { User } from "@/models/user";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/lib/constants";
import type { InvoiceStatus } from "@/lib/constants";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  await dbConnect();

  const invoice = await Invoice.findById(invoiceId)
    .populate("clientId")
    .lean();

  if (!invoice) notFound();

  // Mark as viewed if currently sent
  if (invoice.status === "sent") {
    await Invoice.findByIdAndUpdate(invoiceId, {
      status: "viewed",
      viewedAt: new Date(),
    });
  }

  const sender = await User.findById(invoice.userId).lean();
  const client = invoice.clientId as {
    name: string;
    email: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  };

  const status = (
    invoice.status === "sent" ? "viewed" : invoice.status
  ) as InvoiceStatus;

  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">
              {sender?.businessName || "Invoice"}
            </span>
          </div>
          <Badge
            variant="secondary"
            className={INVOICE_STATUS_COLORS[status]}
          >
            {INVOICE_STATUS_LABELS[status]}
          </Badge>
        </div>

        {/* Invoice */}
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <h2 className="text-2xl font-bold">INVOICE</h2>
                <p className="text-muted-foreground">
                  {invoice.invoiceNumber}
                </p>
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

            <div className="grid gap-6 sm:grid-cols-2">
              {sender && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    From
                  </p>
                  <p className="font-semibold">
                    {sender.businessName ||
                      `${sender.firstName} ${sender.lastName}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {sender.businessEmail || sender.email}
                  </p>
                </div>
              )}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Bill To
                </p>
                <p className="font-semibold">{client.name}</p>
                <p className="text-sm text-muted-foreground">{client.email}</p>
                {client.address?.street && (
                  <p className="text-sm text-muted-foreground">
                    {client.address.street},{" "}
                    {[
                      client.address.city,
                      client.address.state,
                      client.address.zipCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Line Items */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Price</th>
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

            {invoice.notes && (
              <>
                <Separator className="my-6" />
                <p className="text-sm text-muted-foreground">
                  {invoice.notes}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pay Button */}
        {status !== "paid" && status !== "cancelled" && (
          <PayButton invoiceId={invoiceId} total={invoice.total} currency={invoice.currency} />
        )}

        {status === "paid" && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
            <p className="font-semibold text-green-700">
              This invoice has been paid. Thank you!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
