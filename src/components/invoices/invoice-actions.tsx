"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Copy,
  Trash2,
  CheckCircle,
  CreditCard,
  Link2,
  Send,
  Download,
  Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  deleteInvoice,
  duplicateInvoice,
  updateInvoiceStatus,
} from "@/actions/invoice-actions";
import { createCheckoutSession } from "@/actions/payment-actions";
import { sendInvoiceEmail, resendInvoiceEmail } from "@/actions/email-actions";
import { makeInvoiceRecurring } from "@/actions/subscription-actions";
import type { InvoiceType } from "@/types";

interface InvoiceActionsProps {
  invoice: InvoiceType;
}

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [frequency, setFrequency] = useState<"monthly" | "yearly">("monthly");
  const [dueDays, setDueDays] = useState(7);
  const [autoSend, setAutoSend] = useState(true);
  const [label, setLabel] = useState("");

  async function handleMakeRecurring() {
    setRecurringSaving(true);
    try {
      const result = await makeInvoiceRecurring({
        invoiceId: invoice._id,
        frequency,
        dueDays,
        autoSend,
        label: label || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Subscription created");
      setShowRecurring(false);
      router.push(`/subscriptions/${result.subscriptionId}`);
    } finally {
      setRecurringSaving(false);
    }
  }

  async function handleDuplicate() {
    const result = await duplicateInvoice(invoice._id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invoice duplicated");
      router.push(`/invoices/${result.invoiceId}`);
    }
  }

  async function handleMarkPaid() {
    const result = await updateInvoiceStatus(invoice._id, "paid");
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invoice marked as paid");
      router.refresh();
    }
  }

  async function handleGeneratePaymentLink() {
    const result = await createCheckoutSession(invoice._id);
    if (result.error) {
      toast.error(result.error);
    } else if (result.url) {
      await navigator.clipboard.writeText(result.url);
      toast.success("Payment link copied to clipboard");
      router.refresh();
    }
  }

  async function handleSendEmail() {
    const result = await sendInvoiceEmail(invoice._id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invoice sent via email");
      router.refresh();
    }
  }

  async function handleResendEmail() {
    const result = await resendInvoiceEmail(invoice._id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invoice resent with current branding");
      router.refresh();
    }
  }

  function handleCopyPublicLink() {
    const url = `${window.location.origin}/invoice/${invoice._id}`;
    navigator.clipboard.writeText(url);
    toast.success("Public invoice link copied to clipboard");
  }

  async function handleDelete() {
    setLoading(true);
    const result = await deleteInvoice(invoice._id);
    setLoading(false);
    setShowDelete(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invoice deleted");
      router.push("/invoices");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <>
              <DropdownMenuItem onClick={handleSendEmail}>
                <Send className="mr-2 h-4 w-4" />
                Send via Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGeneratePaymentLink}>
                <CreditCard className="mr-2 h-4 w-4" />
                Generate Payment Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMarkPaid}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Paid
              </DropdownMenuItem>
            </>
          )}
          {invoice.status !== "draft" && (
            <DropdownMenuItem onClick={handleResendEmail}>
              <Send className="mr-2 h-4 w-4" />
              Resend with current branding
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a
              href={`/api/invoices/${invoice._id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyPublicLink}>
            <Link2 className="mr-2 h-4 w-4" />
            Copy Public Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowRecurring(true)}>
            <Repeat className="mr-2 h-4 w-4" />
            Make recurring
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete invoice
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete invoice permanently?"
        description={`This will permanently remove invoice ${invoice.invoiceNumber} and any associated payment records. This cannot be undone.`}
        confirmLabel="Delete permanently"
        variant="destructive"
        onConfirm={handleDelete}
        loading={loading}
      />

      <Dialog open={showRecurring} onOpenChange={setShowRecurring}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Make this invoice recurring</DialogTitle>
            <DialogDescription>
              This invoice stays as the first cycle. Future invoices will be
              auto-generated from this template on the schedule below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="rec-freq">Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as "monthly" | "yearly")}
              >
                <SelectTrigger id="rec-freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rec-due">Due in (days)</Label>
              <Input
                id="rec-due"
                type="number"
                min={0}
                value={dueDays}
                onChange={(e) => setDueDays(parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label htmlFor="rec-label">Label (optional)</Label>
              <Input
                id="rec-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Monthly retainer"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Auto-send each cycle by email
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRecurring(false)}
              disabled={recurringSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleMakeRecurring} disabled={recurringSaving}>
              {recurringSaving ? "Creating…" : "Create subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
