import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-user";
import { OnboardingClient } from "@/components/onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const user = await getCurrentUser();

  // If they already belong to a company, send them to the dashboard
  if (user.companyId) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const inviteToken = params.invite;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <OnboardingClient
          email={user.email}
          inviteToken={inviteToken}
        />
      </div>
    </div>
  );
}
