"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { Invoice } from "@/models/invoice";
import { Subscription, SubscriptionFrequency } from "@/models/subscription";

const userScope = (user: { _id: unknown; companyId?: unknown }) =>
  user.companyId ? { companyId: user.companyId } : { userId: user._id };

export async function getSubscriptions(filters?: {
  status?: "active" | "paused" | "cancelled";
}) {
  const user = await getCurrentUser();
  await dbConnect();

  const query: Record<string, unknown> = {
    ...userScope(user as { _id: unknown; companyId?: unknown }),
  };
  if (filters?.status) query.status = filters.status;

  const subs = await Subscription.find(query)
    .populate("clientId", "name email")
    .populate("lastInvoiceId", "invoiceNumber status")
    .sort({ createdAt: -1 })
    .lean();

  return JSON.parse(JSON.stringify(subs));
}

export async function getSubscriptionById(id: string) {
  const user = await getCurrentUser();
  await dbConnect();

  const sub = await Subscription.findOne({
    _id: id,
    ...userScope(user as { _id: unknown; companyId?: unknown }),
  })
    .populate("clientId")
    .populate("lastInvoiceId")
    .lean();

  if (!sub) return null;

  // Pull related invoice history
  const invoices = await Invoice.find({
    userId: user._id,
    clientId: (sub as { clientId: { _id: unknown } | unknown }).clientId,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("invoiceNumber status total currency issueDate dueDate paidAt createdAt")
    .lean();

  return {
    subscription: JSON.parse(JSON.stringify(sub)),
    relatedInvoices: JSON.parse(JSON.stringify(invoices)),
  };
}

interface MakeRecurringInput {
  invoiceId: string;
  frequency: SubscriptionFrequency;
  startDate?: string; // ISO; defaults to today
  dueDays?: number;
  autoSend?: boolean;
  label?: string;
}

/**
 * Convert an existing invoice into a recurring subscription template.
 * The original invoice stays as-is (the historical record / first cycle).
 * Future cycles spawn fresh invoices from this template.
 */
export async function makeInvoiceRecurring(input: MakeRecurringInput) {
  const user = await getCurrentUser();
  await dbConnect();

  const invoice = await Invoice.findOne({
    _id: input.invoiceId,
    userId: user._id,
  });
  if (!invoice) return { error: "Invoice not found" };

  // Compute startDate / nextRunAt
  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  const nextRunAt = new Date(startDate);
  nextRunAt.setHours(0, 0, 0, 0);
  // First cycle generation occurs ONE PERIOD AFTER the invoice was created
  // (the original invoice = cycle 1, so nextRunAt = start + 1 period)
  if (input.frequency === "monthly") {
    nextRunAt.setMonth(nextRunAt.getMonth() + 1);
  } else {
    nextRunAt.setFullYear(nextRunAt.getFullYear() + 1);
  }

  const sub = await Subscription.create({
    userId: user._id,
    companyId: user.companyId,
    clientId: invoice.clientId,
    lineItems: invoice.lineItems,
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    discountAmount: invoice.discountAmount,
    total: invoice.total,
    currency: invoice.currency,
    notes: invoice.notes,
    internalNotes: invoice.internalNotes,
    frequency: input.frequency,
    status: "active",
    autoSend: input.autoSend ?? true,
    dueDays: input.dueDays ?? 7,
    startDate,
    nextRunAt,
    lastInvoiceId: invoice._id,
    lastRunAt: invoice.createdAt,
    invoicesGenerated: 1,
    label: input.label,
  });

  revalidatePath("/subscriptions");
  revalidatePath(`/invoices/${input.invoiceId}`);
  return { success: true, subscriptionId: sub._id.toString() };
}

interface CreateSubscriptionInput {
  clientId: string;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
  taxRate?: number;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  currency?: string;
  notes?: string;
  internalNotes?: string;
  frequency: SubscriptionFrequency;
  startDate: string; // ISO
  dueDays?: number;
  autoSend?: boolean;
  label?: string;
}

export async function createSubscription(input: CreateSubscriptionInput) {
  const user = await getCurrentUser();
  await dbConnect();

  const toCents = (d: number) => Math.round(d * 100);

  const lineItems = input.lineItems.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    unitPrice: toCents(it.unitPrice),
    amount: toCents(it.quantity * it.unitPrice),
  }));
  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const taxRate = input.taxRate || 0;
  const taxAmount = Math.round(subtotal * (taxRate / 100));

  let discountAmount = 0;
  if (input.discountType && input.discountValue) {
    discountAmount =
      input.discountType === "percentage"
        ? Math.round(subtotal * (input.discountValue / 100))
        : toCents(input.discountValue);
  }
  const total = subtotal + taxAmount - discountAmount;

  const startDate = new Date(input.startDate);
  startDate.setHours(0, 0, 0, 0);
  const nextRunAt = new Date(startDate);

  const sub = await Subscription.create({
    userId: user._id,
    companyId: user.companyId,
    clientId: input.clientId,
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    discountType: input.discountType,
    discountValue: input.discountValue,
    discountAmount,
    total,
    currency: input.currency || "USD",
    notes: input.notes,
    internalNotes: input.internalNotes,
    frequency: input.frequency,
    status: "active",
    autoSend: input.autoSend ?? true,
    dueDays: input.dueDays ?? 7,
    startDate,
    nextRunAt,
    invoicesGenerated: 0,
    label: input.label,
  });

  revalidatePath("/subscriptions");
  return { success: true, subscriptionId: sub._id.toString() };
}

export async function updateSubscriptionStatus(
  id: string,
  status: "active" | "paused" | "cancelled"
) {
  const user = await getCurrentUser();
  await dbConnect();

  const sub = await Subscription.findOne({ _id: id, userId: user._id });
  if (!sub) return { error: "Subscription not found" };

  sub.status = status;
  await sub.save();

  revalidatePath("/subscriptions");
  revalidatePath(`/subscriptions/${id}`);
  return { success: true };
}

export async function deleteSubscription(id: string) {
  const user = await getCurrentUser();
  await dbConnect();

  const result = await Subscription.deleteOne({ _id: id, userId: user._id });
  if (result.deletedCount === 0) return { error: "Subscription not found" };

  revalidatePath("/subscriptions");
  return { success: true };
}
