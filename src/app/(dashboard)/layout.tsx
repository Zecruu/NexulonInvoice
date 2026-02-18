import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getCurrentUser } from "@/lib/get-user";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const admin = isAdmin(user.email);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isAdmin={admin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header isAdmin={admin} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
