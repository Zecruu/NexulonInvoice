import mongoose, { Schema, Document } from "mongoose";
import { ILineItem } from "./invoice";

export type SubscriptionFrequency = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "paused" | "cancelled";

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;

  // Template — invoice-shaped data, snapshot from the originating invoice
  lineItems: ILineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  discountAmount: number;
  total: number;
  currency: string;
  notes?: string;
  internalNotes?: string;

  // Recurrence
  frequency: SubscriptionFrequency;
  status: SubscriptionStatus;
  autoSend: boolean;
  dueDays: number;

  // Schedule tracking
  startDate: Date;
  nextRunAt: Date;
  lastRunAt?: Date;
  lastInvoiceId?: mongoose.Types.ObjectId;
  invoicesGenerated: number;

  // Optional name for human readability (e.g. "Monthly retainer")
  label?: string;

  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema<ILineItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    lineItems: { type: [LineItemSchema], required: true },
    subtotal: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountType: { type: String, enum: ["percentage", "fixed"] },
    discountValue: Number,
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    notes: String,
    internalNotes: String,

    frequency: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "cancelled"],
      default: "active",
      index: true,
    },
    autoSend: { type: Boolean, default: true },
    dueDays: { type: Number, default: 7, min: 0 },

    startDate: { type: Date, required: true },
    nextRunAt: { type: Date, required: true, index: true },
    lastRunAt: Date,
    lastInvoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    invoicesGenerated: { type: Number, default: 0 },

    label: String,
  },
  { timestamps: true }
);

SubscriptionSchema.index({ status: 1, nextRunAt: 1 });
SubscriptionSchema.index({ userId: 1, status: 1, createdAt: -1 });

export function computeNextRunAt(
  current: Date,
  frequency: SubscriptionFrequency
): Date {
  const next = new Date(current);
  if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export const Subscription =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
