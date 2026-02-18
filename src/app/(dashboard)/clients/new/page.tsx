import { PageHeader } from "@/components/shared/page-header";
import { ClientForm } from "@/components/clients/client-form";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Add Client" description="Create a new client record." />
      <ClientForm />
    </div>
  );
}
