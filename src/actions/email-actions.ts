"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { Invoice } from "@/models/invoice";
import { resend } from "@/lib/resend";
import { InvoiceEmail } from "@/components/email/invoice-email";
import { formatCurrency, formatDate } from "@/lib/format";

export async function sendInvoiceEmail(invoiceId: string) {
  const user = await getCurrentUser();
  await dbConnect();

  const invoice = await Invoice.findOne({
    _id: invoiceId,
    userId: user._id,
  }).populate("clientId");

  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === "paid") return { error: "Invoice is already paid" };
  if (invoice.status === "cancelled")
    return { error: "Invoice is cancelled" };

  const client = invoice.clientId as {
    name: string;
    email: string;
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const paymentUrl = `${appUrl}/invoice/${invoiceId}`;
  const businessName =
    user.businessName || `${user.firstName} ${user.lastName}`;

  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from: `${businessName} <${fromEmail}>`,
    to: client.email,
    subject: `Invoice ${invoice.invoiceNumber} from ${businessName}`,
    react: InvoiceEmail({
      invoiceNumber: invoice.invoiceNumber,
      clientName: client.name,
      businessName,
      total: formatCurrency(invoice.total, invoice.currency),
      dueDate: formatDate(invoice.dueDate),
      paymentUrl,
    }),
  });

  if (error) {
    return { error: `Failed to send email: ${error.message}` };
  }

  // Update invoice status
  invoice.status = invoice.status === "draft" ? "sent" : invoice.status;
  invoice.sentAt = new Date();
  invoice.sentTo = client.email;
  await invoice.save();

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { success: true };
}
