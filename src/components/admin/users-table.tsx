"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateUserTier } from "@/actions/admin-actions";
import { TIER_COLORS, TIER_LABELS, TIER_LIMITS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { AdminUserType } from "@/types";
import type { Tier } from "@/lib/constants";

interface UsersTableProps {
  users: AdminUserType[];
}

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter();
  const [pendingChange, setPendingChange] = useState<{
    userId: string;
    name: string;
    newTier: Tier;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!pendingChange) return;
    setLoading(true);
    const result = await updateUserTier(pendingChange.userId, pendingChange.newTier);
    setLoading(false);
    setPendingChange(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        `${pendingChange.name} upgraded to ${TIER_LABELS[pendingChange.newTier]}`
      );
      router.refresh();
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-center">Invoices (month)</TableHead>
              <TableHead className="hidden md:table-cell">Signed Up</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const name =
                [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                user.businessName ||
                "—";
              const tier = (user.tier || "free") as Tier;
              const limit = TIER_LIMITS[tier];

              return (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={TIER_COLORS[tier]}>
                      {TIER_LABELS[tier]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        user.invoicesThisMonth >= limit
                          ? "font-semibold text-destructive"
                          : ""
                      }
                    >
                      {user.invoicesThisMonth}
                    </span>
                    <span className="text-muted-foreground">/{limit}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPendingChange({
                          userId: user._id,
                          name,
                          newTier: tier === "free" ? "pro" : "free",
                        })
                      }
                    >
                      <ArrowUpDown className="mr-1 h-3 w-3" />
                      {tier === "free" ? "Upgrade" : "Downgrade"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!pendingChange}
        onOpenChange={(open) => !open && setPendingChange(null)}
        title={`Change tier to ${pendingChange ? TIER_LABELS[pendingChange.newTier] : ""}`}
        description={
          pendingChange
            ? `Are you sure you want to change ${pendingChange.name} to the ${TIER_LABELS[pendingChange.newTier]} tier?`
            : ""
        }
        confirmLabel="Confirm"
        onConfirm={handleConfirm}
        loading={loading}
      />
    </>
  );
}
