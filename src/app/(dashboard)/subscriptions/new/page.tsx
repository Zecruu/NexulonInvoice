import { getClients } from "@/actions/client-actions";
import { PageHeader } from "@/components/shared/page-header";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";

export const dynamic = "force-dynamic";

export default async function NewSubscriptionPage() {
  const { clients } = await getClients({ limit: 100 });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="New subscription"
        description="A recurring template that auto-generates an invoice each cycle."
      />
      <SubscriptionForm clients={clients} />
    </div>
  );
}
