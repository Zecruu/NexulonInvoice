import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getClientById, getClientInvoices } from "@/actions/client-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from "@/lib/constants";
import type { InvoiceStatus } from "@/lib/constants";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getClientById(clientId);
  if (!client) notFound();

  const invoices = await getClientInvoices(clientId);

  return (
    <div className="space-y-6">
      <PageHeader title={client.name}>
        <Link href={`/clients/${clientId}/edit`}>
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </PageHeader>

      {/* Client Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {client.email}
            </div>
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {client.phone}
              </div>
            )}
            {client.contactPerson && (
              <p className="text-muted-foreground">
                Contact: {client.contactPerson}
              </p>
            )}
          </CardContent>
        </Card>

        {client.address?.street && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p>{client.address.street}</p>
                  <p>
                    {[client.address.city, client.address.state, client.address.zipCode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {client.address.country && <p>{client.address.country}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Invoice Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Total Invoices:{" "}
              <span className="font-semibold">{client.stats.totalInvoices}</span>
            </p>
            <p>
              Revenue:{" "}
              <span className="font-semibold">
                {formatCurrency(client.stats.totalRevenue)}
              </span>
            </p>
            <p>
              Outstanding:{" "}
              <span className="font-semibold">
                {formatCurrency(client.stats.outstandingAmount)}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map(
                (inv: {
                  _id: string;
                  invoiceNumber: string;
                  status: InvoiceStatus;
                  total: number;
                  issueDate: string;
                }) => (
                  <Link
                    key={inv._id}
                    href={`/invoices/${inv._id}`}
                    className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{inv.invoiceNumber}</span>
                      <Badge
                        variant="secondary"
                        className={INVOICE_STATUS_COLORS[inv.status]}
                      >
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </Badge>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{formatCurrency(inv.total)}</p>
                      <p className="text-muted-foreground">
                        {formatDate(inv.issueDate)}
                      </p>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
