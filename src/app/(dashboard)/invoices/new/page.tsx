import { PageHeader } from "@/components/shared/page-header";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { getClients } from "@/actions/client-actions";

export default async function NewInvoicePage() {
  const { clients } = await getClients({ limit: 100 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Invoice"
        description="Create a new invoice for a client."
      />
      <InvoiceForm clients={clients} />
    </div>
  );
}
