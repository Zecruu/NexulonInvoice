import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { getInvoiceById } from "@/actions/invoice-actions";
import { getClients } from "@/actions/client-actions";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) notFound();

  if (invoice.status === "paid" || invoice.status === "cancelled") {
    redirect(`/invoices/${invoiceId}`);
  }

  const { clients } = await getClients({ limit: 100 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Invoice"
        description={`Editing ${invoice.invoiceNumber}`}
      />
      <InvoiceForm clients={clients} invoice={invoice} />
    </div>
  );
}
