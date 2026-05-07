"use client";

import { useState } from "react";
import { Forward } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { forwardLeadsByEmail } from "@/actions/lead-actions";

interface ForwardLeadsDialogProps {
  selectedLeadIds: string[];
  selectedSummary: string; // e.g. "3 hot leads"
  onForwarded: () => void;
}

export function ForwardLeadsDialog({
  selectedLeadIds,
  selectedSummary,
  onForwarded,
}: ForwardLeadsDialogProps) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (selectedLeadIds.length === 0) {
      toast.error("Select at least one lead first");
      return;
    }
    if (!recipient.trim()) {
      toast.error("Recipient email is required");
      return;
    }

    setSaving(true);
    const r = await forwardLeadsByEmail({
      leadIds: selectedLeadIds,
      recipientEmail: recipient.trim(),
      note: note.trim() || undefined,
    });
    setSaving(false);

    if (r.error) {
      toast.error(r.error);
      return;
    }

    toast.success(
      `Sent ${r.sentCount} lead${r.sentCount === 1 ? "" : "s"} to ${recipient.trim()}`
    );
    setOpen(false);
    setNote("");
    onForwarded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        disabled={selectedLeadIds.length === 0}
      >
        <Forward className="mr-1.5 h-3.5 w-3.5" />
        Forward {selectedLeadIds.length > 0 ? selectedSummary : "leads"}
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward leads via email</DialogTitle>
          <DialogDescription>
            Sending {selectedSummary}. The recipient gets each lead&apos;s name,
            phone, Athena&apos;s summary, intake details, and a link back to
            the conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="recipient">Recipient email</Label>
            <Input
              id="recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="team@yourclinic.com"
            />
          </div>
          <div>
            <Label htmlFor="note">
              Note (optional){" "}
              <span className="text-muted-foreground">— shown at the top</span>
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Please prioritize calling the hot leads first."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
