import { FileText, Users, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { DashboardMetrics } from "@/types";

interface StatsCardsProps {
  metrics: DashboardMetrics;
}

export function StatsCards({ metrics }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue),
      description: "From paid invoices",
      icon: DollarSign,
    },
    {
      title: "Outstanding",
      value: formatCurrency(metrics.outstandingAmount),
      description: "Awaiting payment",
      icon: FileText,
    },
    {
      title: "Overdue",
      value: metrics.overdueCount.toString(),
      description: "Past due date",
      icon: AlertCircle,
    },
    {
      title: "Total Clients",
      value: metrics.totalClients.toString(),
      description: "Active clients",
      icon: Users,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
