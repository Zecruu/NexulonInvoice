import { redirect } from "next/navigation";
import { userHasInvoicing } from "@/lib/features";

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = await userHasInvoicing();
  if (!enabled) redirect("/whatsapp");
  return <>{children}</>;
}
