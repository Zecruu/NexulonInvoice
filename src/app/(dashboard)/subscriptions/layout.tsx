import { redirect } from "next/navigation";
import { userHasInvoicing } from "@/lib/features";

export default async function SubscriptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = await userHasInvoicing();
  if (!enabled) redirect("/dashboard");
  return <>{children}</>;
}
