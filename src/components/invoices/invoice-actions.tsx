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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { sendInvoiceEmail } from "@/actions/email-actions";
import type { InvoiceType } from "@/types";

interface InvoiceActionsProps {
  invoice: InvoiceType;
}

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);

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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {invoice.status === "draft" ? "Delete" : "Cancel"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Invoice"
        description={
          invoice.status === "draft"
            ? "This will permanently delete this draft invoice."
            : "This will mark this invoice as cancelled."
        }
        confirmLabel="Confirm"
        variant="destructive"
        onConfirm={handleDelete}
        loading={loading}
      />
    </>
  );
}
