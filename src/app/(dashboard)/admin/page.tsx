import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, Users, Crown, FileText, Bot, BookTemplate } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable } from "@/components/admin/users-table";
import { getAdminStats, getAdminUsers } from "@/actions/admin-actions";
import { getCurrentUser } from "@/lib/get-user";
import { isAdmin } from "@/lib/admin";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) redirect("/dashboard");

  const params = await searchParams;
  const [stats, { users, totalCount }] = await Promise.all([
    getAdminStats(),
    getAdminUsers({
      search: params.search,
      page: params.page ? parseInt(params.page) : 1,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Users" description="Manage users, tiers, and access">
          <Shield className="h-5 w-5 text-muted-foreground" />
        </PageHeader>
        <div className="flex gap-2">
          <Link href="/admin/bots">
            <Button variant="outline" size="sm">
              <Bot className="mr-2 h-4 w-4" />
              Bots
            </Button>
          </Link>
          <Link href="/admin/templates">
            <Button variant="outline" size="sm">
              <BookTemplate className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Users</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.proUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.freeUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices (month)</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.invoicesThisMonth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <UsersTable users={users} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
