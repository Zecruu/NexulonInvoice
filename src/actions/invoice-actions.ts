"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { Invoice } from "@/models/invoice";
import { Client } from "@/models/client";
import { Payment } from "@/models/payment";
import { invoiceSchema, InvoiceFormData } from "@/lib/validations";
import { TIER_LIMITS, TIER_LABELS } from "@/lib/constants";
import type { InvoiceStatus, Tier } from "@/lib/constants";
import { sendInvoiceEmail } from "@/actions/email-actions";

/**
 * Convert form values (dollars) to storage values (cents).
 * Users enter prices in dollars (e.g. 300.00), we store in cents (30000).
 */
function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function calculateTotals(data: InvoiceFormData) {
  // Form values are in dollars — convert to cents for storage
  const lineItems = data.lineItems.map((item) => ({
    ...item,
    unitPrice: toCents(item.unitPrice),
    amount: toCents(item.quantity * item.unitPrice),
  }));

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = Math.round(subtotal * (data.taxRate / 100));

  let discountAmount = 0;
  if (data.discountType && data.discountValue) {
    if (data.discountType === "percentage") {
      discountAmount = Math.round(subtotal * (data.discountValue / 100));
    } else {
      // Fixed discount is also entered in dollars
      discountAmount = toCents(data.discountValue);
    }
  }

  const total = subtotal + taxAmount - discountAmount;

  return {
    subtotal,
    taxAmount,
    discountAmount,
    total,
    lineItems,
  };
}

async function generateInvoiceNumber(userId: string): Promise<string> {
  const lastInvoice = await Invoice.findOne({ userId })
    .sort({ invoiceNumber: -1 })
    .select("invoiceNumber")
    .lean();

  if (!lastInvoice) return "INV-0001";

  const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-")[1], 10);
  const nextNumber = (lastNumber + 1).toString().padStart(4, "0");
  return `INV-${nextNumber}`;
}

export async function getInvoices(filters?: {
  status?: InvoiceStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const user = await getCurrentUser();
  await dbConnect();

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { userId: user._id };

  if (filters?.status) {
    query.status = filters.status;
  }

  if (filters?.search) {
    // Search by invoice number or client name
    const matchingClients = await Client.find({
      userId: user._id,
      name: { $regex: filters.search, $options: "i" },
    }).select("_id");

    const clientIds = matchingClients.map((c) => c._id);

    query.$or = [
      { invoiceNumber: { $regex: filters.search, $options: "i" } },
      { clientId: { $in: clientIds } },
    ];
  }

  const [invoices, totalCount] = await Promise.all([
    Invoice.find(query)
      .populate("clientId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(query),
  ]);

  return {
    invoices: JSON.parse(JSON.stringify(invoices)),
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
  };
}

export async function getInvoiceById(invoiceId: string) {
  const user = await getCurrentUser();
  await dbConnect();

  const invoice = await Invoice.findOne({
    _id: invoiceId,
    userId: user._id,
  })
    .populate("clientId")
    .lean();

  if (!invoice) return null;
  return JSON.parse(JSON.stringify(invoice));
}

export async function createInvoice(data: InvoiceFormData) {
  const user = await getCurrentUser();
  await dbConnect();

  // Enforce monthly invoice limit based on user tier
  const tier = (user.tier || "free") as Tier;
  const limit = TIER_LIMITS[tier];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const invoicesThisMonth = await Invoice.countDocuments({
    userId: user._id,
    createdAt: { $gte: monthStart },
  });

  if (invoicesThisMonth >= limit) {
    return {
      error: `Monthly invoice limit reached (${limit} for ${TIER_LABELS[tier]} tier). Upgrade to Pro for up to ${TIER_LIMITS.pro} invoices/month.`,
    };
  }

  const parsed = invoiceSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { subtotal, taxAmount, discountAmount, total, lineItems } =
    calculateTotals(parsed.data);

  const invoiceNumber = await generateInvoiceNumber(user._id.toString());

  const invoice = await Invoice.create({
    userId: user._id,
    clientId: parsed.data.clientId,
    invoiceNumber,
    status: "draft",
    issueDate: new Date(parsed.data.issueDate),
    dueDate: new Date(parsed.data.dueDate),
    lineItems,
    subtotal,
    taxRate: parsed.data.taxRate,
    taxAmount,
    discountType: parsed.data.discountType,
    discountValue: parsed.data.discountValue,
    discountAmount,
    total,
    currency: parsed.data.currency,
    notes: parsed.data.notes,
    internalNotes: parsed.data.internalNotes,
  });

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { success: true, invoiceId: invoice._id.toString() };
}

/**
 * Create an invoice AND immediately email it to the client (same flow as
 * the subscription "Send invoice now" button). Status is flipped to "sent"
 * by sendInvoiceEmail; sentAt is recorded; the email contains a link to
 * the public invoice page where the client can pay via Stripe.
 */
export async function createAndSendInvoice(data: InvoiceFormData) {
  const created = await createInvoice(data);
  if ("error" in created && created.error) return created;
  if (!("invoiceId" in created) || !created.invoiceId) {
    return { error: "Failed to create invoice" };
  }

  const sent = await sendInvoiceEmail(created.invoiceId);
  if ("error" in sent && sent.error) {
    // Invoice exists as draft; surface error so the user can retry the send
    return {
      success: true,
      invoiceId: created.invoiceId,
      sendError: sent.error,
    };
  }

  return { success: true, invoiceId: created.invoiceId, sent: true };
}

export async function updateInvoice(invoiceId: string, data: InvoiceFormData) {
  const user = await getCurrentUser();
  await dbConnect();

  const existing = await Invoice.findOne({ _id: invoiceId, userId: user._id });
  if (!existing) return { error: "Invoice not found" };

  if (existing.status === "paid" || existing.status === "cancelled") {
    return { error: `Cannot edit a ${existing.status} invoice` };
  }

  const parsed = invoiceSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { subtotal, taxAmount, discountAmount, total, lineItems } =
    calculateTotals(parsed.data);

  await Invoice.findByIdAndUpdate(invoiceId, {
    clientId: parsed.data.clientId,
    issueDate: new Date(parsed.data.issueDate),
    dueDate: new Date(parsed.data.dueDate),
    lineItems,
    subtotal,
    taxRate: parsed.data.taxRate,
    taxAmount,
    discountType: parsed.data.discountType,
    discountValue: parsed.data.discountValue,
    discountAmount,
    total,
    currency: parsed.data.currency,
    notes: parsed.data.notes,
    internalNotes: parsed.data.internalNotes,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteInvoice(invoiceId: string) {
  const user = await getCurrentUser();
  await dbConnect();

  const invoice = await Invoice.findOne({ _id: invoiceId, userId: user._id });
  if (!invoice) return { error: "Invoice not found" };

  if (invoice.status === "paid") {
    return {
      error:
        "Cannot delete a paid invoice. Refund the payment in Stripe first, then delete.",
    };
  }

  await Payment.deleteMany({ invoiceId: invoice._id });
  await Invoice.findByIdAndDelete(invoiceId);

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function duplicateInvoice(invoiceId: string) {
  const user = await getCurrentUser();
  await dbConnect();

  // Enforce monthly invoice limit
  const tier = (user.tier || "free") as Tier;
  const limit = TIER_LIMITS[tier];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const invoicesThisMonth = await Invoice.countDocuments({
    userId: user._id,
    createdAt: { $gte: monthStart },
  });

  if (invoicesThisMonth >= limit) {
    return {
      error: `Monthly invoice limit reached (${limit} for ${TIER_LABELS[tier]} tier). Upgrade to Pro for up to ${TIER_LIMITS.pro} invoices/month.`,
    };
  }

  const original = await Invoice.findOne({
    _id: invoiceId,
    userId: user._id,
  }).lean();
  if (!original) return { error: "Invoice not found" };

  const invoiceNumber = await generateInvoiceNumber(user._id.toString());

  const now = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const duplicate = await Invoice.create({
    userId: original.userId,
    clientId: original.clientId,
    invoiceNumber,
    status: "draft",
    issueDate: now,
    dueDate,
    lineItems: original.lineItems,
    subtotal: original.subtotal,
    taxRate: original.taxRate,
    taxAmount: original.taxAmount,
    discountType: original.discountType,
    discountValue: original.discountValue,
    discountAmount: original.discountAmount,
    total: original.total,
    currency: original.currency,
    notes: original.notes,
    internalNotes: original.internalNotes,
  });

  revalidatePath("/invoices");
  return { success: true, invoiceId: duplicate._id.toString() };
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus
) {
  const user = await getCurrentUser();
  await dbConnect();

  const invoice = await Invoice.findOne({ _id: invoiceId, userId: user._id });
  if (!invoice) return { error: "Invoice not found" };

  invoice.status = status;
  if (status === "paid") {
    invoice.paidAt = new Date();
    invoice.paidAmount = invoice.total;
  }
  await invoice.save();

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
