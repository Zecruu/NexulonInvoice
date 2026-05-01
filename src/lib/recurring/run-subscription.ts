import { Invoice } from "@/models/invoice";
import { User } from "@/models/user";
import { Client } from "@/models/client";
import {
  Subscription,
  ISubscription,
  computeNextRunAt,
} from "@/models/subscription";
import { resend } from "@/lib/resend";
import { InvoiceEmail } from "@/components/email/invoice-email";
import { formatCurrency, formatDate } from "@/lib/format";

async function nextInvoiceNumber(userId: string): Promise<string> {
  const last = await Invoice.findOne({ userId })
    .sort({ createdAt: -1 })
    .select("invoiceNumber")
    .lean();

  if (!last) return "INV-0001";
  const parts = last.invoiceNumber.split("-");
  const n = parseInt(parts[1], 10);
  if (isNaN(n)) return "INV-0001";
  return `INV-${(n + 1).toString().padStart(4, "0")}`;
}

export interface RunSubscriptionResult {
  invoiceId: string;
  invoiceNumber: string;
  emailed: boolean;
  emailError?: string;
}

/**
 * Generate the next invoice for a subscription, optionally email it,
 * and advance the schedule. Used by both the cron and the manual "Run now" action.
 */
export async function runSubscriptionOnce(
  sub: ISubscription
): Promise<RunSubscriptionResult> {
  const now = new Date();
  const invoiceNumber = await nextInvoiceNumber(sub.userId.toString());

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + (sub.dueDays ?? 7));

  const invoice = await Invoice.create({
    userId: sub.userId,
    clientId: sub.clientId,
    invoiceNumber,
    status: sub.autoSend ? "sent" : "draft",
    issueDate: now,
    dueDate,
    lineItems: sub.lineItems,
    subtotal: sub.subtotal,
    taxRate: sub.taxRate,
    taxAmount: sub.taxAmount,
    discountType: sub.discountType,
    discountValue: sub.discountValue,
    discountAmount: sub.discountAmount,
    total: sub.total,
    currency: sub.currency,
    notes: sub.notes,
    internalNotes: sub.internalNotes,
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://invoice.nexulonllc.com";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@nexulonllc.com";

  let emailed = false;
  let emailError: string | undefined;

  if (sub.autoSend) {
    const [user, client] = await Promise.all([
      User.findById(sub.userId)
        .select("businessName firstName lastName")
        .lean(),
      Client.findById(sub.clientId).select("name email").lean(),
    ]);

    if (client?.email && user) {
      const businessName =
        user.businessName ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        "Nexulon Invoice";
      const paymentUrl = `${appUrl}/invoice/${invoice._id.toString()}`;

      const { error } = await resend.emails.send({
        from: `${businessName} <${fromEmail}>`,
        to: client.email,
        subject: `Invoice ${invoiceNumber} from ${businessName}`,
        react: InvoiceEmail({
          invoiceNumber,
          clientName: client.name,
          businessName,
          total: formatCurrency(invoice.total, invoice.currency),
          dueDate: formatDate(invoice.dueDate),
          paymentUrl,
        }),
      });

      if (!error) {
        invoice.sentAt = new Date();
        invoice.sentTo = client.email;
        await invoice.save();
        emailed = true;
      } else {
        invoice.status = "draft";
        await invoice.save();
        emailError = error.message;
      }
    } else {
      invoice.status = "draft";
      await invoice.save();
      emailError = "Client email or user record missing";
    }
  }

  sub.lastInvoiceId = invoice._id;
  sub.lastRunAt = now;
  sub.invoicesGenerated = (sub.invoicesGenerated || 0) + 1;
  sub.nextRunAt = computeNextRunAt(sub.nextRunAt, sub.frequency);
  await sub.save();

  return {
    invoiceId: invoice._id.toString(),
    invoiceNumber,
    emailed,
    emailError,
  };
}

export async function findDueSubscriptions(now: Date, limit = 200) {
  return Subscription.find({
    status: "active",
    nextRunAt: { $lte: now },
  }).limit(limit);
}
