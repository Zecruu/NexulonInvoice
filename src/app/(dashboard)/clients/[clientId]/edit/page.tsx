import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { getClientById } from "@/actions/client-actions";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getClientById(clientId);
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Edit Client"
        description={`Editing ${client.name}`}
      />
      <ClientForm client={client} />
    </div>
  );
}
