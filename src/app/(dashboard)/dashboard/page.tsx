import { StatsCards } from "@/components/dashboard/stats-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import {
  getDashboardMetrics,
  getRecentInvoices,
  getRevenueByMonth,
} from "@/actions/dashboard-actions";

export default async function DashboardPage() {
  const [metrics, recentInvoices, revenueData] = await Promise.all([
    getDashboardMetrics(),
    getRecentInvoices(),
    getRevenueByMonth(12),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <StatsCards metrics={metrics} />
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart data={revenueData} />
        <RecentInvoices invoices={recentInvoices} />
      </div>
    </div>
  );
}
