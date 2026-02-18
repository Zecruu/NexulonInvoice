import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ClientTable } from "@/components/clients/client-table";
import { getClients } from "@/actions/client-actions";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { clients, totalCount } = await getClients({
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description={`${totalCount} total clients`}>
        <Link href="/clients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </PageHeader>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client to start creating invoices."
        >
          <Link href="/clients/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </Link>
        </EmptyState>
      ) : (
        <ClientTable clients={clients} />
      )}
    </div>
  );
}
