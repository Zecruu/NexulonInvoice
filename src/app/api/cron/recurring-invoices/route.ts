import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Invoice } from "@/models/invoice";
import { User } from "@/models/user";
import { Client } from "@/models/client";
import { Subscription, computeNextRunAt } from "@/models/subscription";
import { resend } from "@/lib/resend";
import { InvoiceEmail } from "@/components/email/invoice-email";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function generateInvoiceNumber(userId: string): Promise<string> {
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

interface RunResult {
  subscriptionId: string;
  invoiceId?: string;
  invoiceNumber?: string;
  emailed?: boolean;
  error?: string;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const now = new Date();

  const due = await Subscription.find({
    status: "active",
    nextRunAt: { $lte: now },
  }).limit(200);

  const results: RunResult[] = [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://invoice.nexulonllc.com";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@nexulonllc.com";

  for (const sub of due) {
    try {
      const invoiceNumber = await generateInvoiceNumber(sub.userId.toString());

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

      let emailed = false;
      if (sub.autoSend) {
        const [user, client] = await Promise.all([
          User.findById(sub.userId).select(
            "businessName firstName lastName"
          ).lean(),
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
          }
        } else {
          invoice.status = "draft";
          await invoice.save();
        }
      }

      sub.lastInvoiceId = invoice._id;
      sub.lastRunAt = now;
      sub.invoicesGenerated = (sub.invoicesGenerated || 0) + 1;
      sub.nextRunAt = computeNextRunAt(sub.nextRunAt, sub.frequency);
      await sub.save();

      results.push({
        subscriptionId: sub._id.toString(),
        invoiceId: invoice._id.toString(),
        invoiceNumber,
        emailed,
      });
    } catch (err) {
      results.push({
        subscriptionId: sub._id.toString(),
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    processed: results.length,
    results,
  });
}
