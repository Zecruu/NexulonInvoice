"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  updateSubscriptionStatus,
  deleteSubscription,
} from "@/actions/subscription-actions";
import { toast } from "sonner";
import { Pause, Play, Trash2 } from "lucide-react";

export function SubscriptionActions({
  id,
  status,
}: {
  id: string;
  status: "active" | "paused" | "cancelled";
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = status === "active" ? "paused" : "active";
    const r = await updateSubscriptionStatus(id, next);
    setLoading(false);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success(next === "paused" ? "Subscription paused" : "Subscription resumed");
    router.refresh();
  }

  async function cancel() {
    setLoading(true);
    const r = await deleteSubscription(id);
    setLoading(false);
    setConfirmOpen(false);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Subscription deleted");
    router.push("/subscriptions");
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2">
        {status !== "cancelled" && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggle}
            disabled={loading}
          >
            {status === "active" ? (
              <>
                <Pause className="mr-1.5 h-3.5 w-3.5" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Resume
              </>
            )}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this subscription?"
        description="This stops all future invoice generation for this template. Already-generated invoices stay. This cannot be undone."
        confirmLabel="Delete subscription"
        onConfirm={cancel}
        loading={loading}
      />
    </>
  );
}
