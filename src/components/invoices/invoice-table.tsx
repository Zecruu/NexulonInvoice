"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteInvoice, duplicateInvoice } from "@/actions/invoice-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceType, ClientType } from "@/types";

interface InvoiceTableProps {
  invoices: (InvoiceType & { clientId: ClientType })[];
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteInvoice(deleteId);
    setDeleting(false);
    setDeleteId(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invoice deleted");
      router.refresh();
    }
  }

  async function handleDuplicate(invoiceId: string) {
    const result = await duplicateInvoice(invoiceId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invoice duplicated");
      router.push(`/invoices/${result.invoiceId}`);
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Issue Date</TableHead>
              <TableHead className="hidden md:table-cell">Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice._id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/invoices/${invoice._id}`}
                    className="hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  {typeof invoice.clientId === "object"
                    ? invoice.clientId.name
                    : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDate(invoice.issueDate)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDate(invoice.dueDate)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.total, invoice.currency)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/invoices/${invoice._id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      {invoice.status !== "paid" &&
                        invoice.status !== "cancelled" && (
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/${invoice._id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                        )}
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(invoice._id)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(invoice._id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {invoice.status === "draft" ? "Delete" : "Cancel"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Invoice"
        description="Are you sure? Draft invoices will be deleted permanently. Active invoices will be marked as cancelled."
        confirmLabel="Confirm"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
