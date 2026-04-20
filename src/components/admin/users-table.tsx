"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Ban, CheckCircle2, Trash2 } from "lucide-react";
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
import {
  updateUserTier,
  banUser,
  unbanUser,
  deleteUser,
} from "@/actions/admin-actions";
import { TIER_COLORS, TIER_LABELS, TIER_LIMITS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { AdminUserType } from "@/types";
import type { Tier } from "@/lib/constants";

interface UsersTableProps {
  users: AdminUserType[];
}

type PendingAction =
  | { kind: "tier"; userId: string; name: string; newTier: Tier }
  | { kind: "ban"; userId: string; name: string }
  | { kind: "unban"; userId: string; name: string }
  | { kind: "delete"; userId: string; name: string };

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!pending) return;
    setLoading(true);

    let result: { error?: string; success?: boolean } = {};
    if (pending.kind === "tier") {
      result = await updateUserTier(pending.userId, pending.newTier);
    } else if (pending.kind === "ban") {
      result = await banUser(pending.userId);
    } else if (pending.kind === "unban") {
      result = await unbanUser(pending.userId);
    } else if (pending.kind === "delete") {
      result = await deleteUser(pending.userId);
    }

    setLoading(false);
    const snapshot = pending;
    setPending(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (snapshot.kind === "tier") {
      toast.success(`${snapshot.name} → ${TIER_LABELS[snapshot.newTier]}`);
    } else if (snapshot.kind === "ban") {
      toast.success(`${snapshot.name} banned`);
    } else if (snapshot.kind === "unban") {
      toast.success(`${snapshot.name} unbanned`);
    } else if (snapshot.kind === "delete") {
      toast.success(`${snapshot.name} deleted`);
    }
    router.refresh();
  }

  function dialogTitle() {
    if (!pending) return "";
    if (pending.kind === "tier") return `Change tier to ${TIER_LABELS[pending.newTier]}`;
    if (pending.kind === "ban") return "Ban user";
    if (pending.kind === "unban") return "Unban user";
    return "Delete user";
  }

  function dialogDescription() {
    if (!pending) return "";
    if (pending.kind === "tier") {
      return `Change ${pending.name} to the ${TIER_LABELS[pending.newTier]} tier?`;
    }
    if (pending.kind === "ban") {
      return `Suspend ${pending.name}'s access? They'll see a banned screen until unbanned.`;
    }
    if (pending.kind === "unban") {
      return `Restore ${pending.name}'s access?`;
    }
    return `Permanently delete ${pending.name}? This removes the user from the database AND deletes their Clerk account. This cannot be undone.`;
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
              const banned = Boolean((user as unknown as { banned?: boolean }).banned);

              return (
                <TableRow key={user._id} className={banned ? "opacity-60" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {name}
                      {banned && (
                        <Badge variant="destructive" className="text-[10px]">
                          Banned
                        </Badge>
                      )}
                    </div>
                  </TableCell>
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
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPending({
                            kind: "tier",
                            userId: user._id,
                            name,
                            newTier: tier === "free" ? "pro" : "free",
                          })
                        }
                      >
                        <ArrowUpDown className="mr-1 h-3 w-3" />
                        {tier === "free" ? "Upgrade" : "Downgrade"}
                      </Button>
                      {banned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPending({ kind: "unban", userId: user._id, name })
                          }
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Unban
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPending({ kind: "ban", userId: user._id, name })
                          }
                        >
                          <Ban className="mr-1 h-3 w-3" />
                          Ban
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setPending({ kind: "delete", userId: user._id, name })
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        title={dialogTitle()}
        description={dialogDescription()}
        confirmLabel={pending?.kind === "delete" ? "Delete" : "Confirm"}
        onConfirm={handleConfirm}
        loading={loading}
      />
    </>
  );
}
