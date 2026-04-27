"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteConversationButton({ waPhone }: { waPhone: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${encodeURIComponent(waPhone)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg || "Delete failed");
        return;
      }
      toast.success("Conversation deleted — Athena will treat them as a new patient");
      router.push("/whatsapp");
      router.refresh();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this conversation?"
        description={`Wipes the conversation with ${waPhone}, the lead row, and all signal history. Use this when you want to retest with Athena from scratch — next message from this number starts a brand-new conversation. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={loading}
      />
    </>
  );
}
