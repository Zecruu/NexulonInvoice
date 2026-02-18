import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { getInvoices } from "@/actions/invoice-actions";
import type { InvoiceStatus } from "@/lib/constants";

const statusTabs = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const status =
    params.status && params.status !== "all"
      ? (params.status as InvoiceStatus)
      : undefined;

  const { invoices, totalCount } = await getInvoices({
    status,
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description={`${totalCount} total invoices`}>
        <Link href="/invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Link>
      </PageHeader>

      <Tabs defaultValue={params.status || "all"}>
        <TabsList>
          {statusTabs.map((tab) => (
            <Link
              key={tab.value}
              href={
                tab.value === "all"
                  ? "/invoices"
                  : `/invoices?status=${tab.value}`
              }
            >
              <TabsTrigger value={tab.value}>{tab.label}</TabsTrigger>
            </Link>
          ))}
        </TabsList>
      </Tabs>

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description={
            status
              ? `No ${status} invoices. Try a different filter.`
              : "Create your first invoice to get started."
          }
        >
          {!status && (
            <Link href="/invoices/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </Link>
          )}
        </EmptyState>
      ) : (
        <InvoiceTable invoices={invoices} />
      )}
    </div>
  );
}
