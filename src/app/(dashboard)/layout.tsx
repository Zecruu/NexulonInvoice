import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getCurrentUser } from "@/lib/get-user";
import { isAdmin } from "@/lib/admin";
import { userHasInvoicing } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user.banned) redirect("/banned");
  if (!user.companyId) redirect("/onboarding");
  const admin = isAdmin(user.email);
  const invoicingEnabled = await userHasInvoicing();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isAdmin={admin} invoicingEnabled={invoicingEnabled} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header isAdmin={admin} invoicingEnabled={invoicingEnabled} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
