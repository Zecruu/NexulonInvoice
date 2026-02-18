import mongoose, { Schema, Document } from "mongoose";

export interface ILineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "paid"
  | "overdue"
  | "cancelled";

export interface IInvoice extends Document {
  userId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
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
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  paymentLink?: string;
  paidAt?: Date;
  paidAmount?: number;
  sentAt?: Date;
  sentTo?: string;
  viewedAt?: Date;
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

const InvoiceSchema = new Schema<IInvoice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    invoiceNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "paid", "overdue", "cancelled"],
      default: "draft",
      index: true,
    },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    lineItems: {
      type: [LineItemSchema],
      required: true,
      validate: {
        validator: (v: ILineItem[]) => v.length > 0,
        message: "At least one line item is required",
      },
    },
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
    stripePaymentIntentId: String,
    stripeCheckoutSessionId: String,
    paymentLink: String,
    paidAt: Date,
    paidAmount: Number,
    sentAt: Date,
    sentTo: String,
    viewedAt: Date,
  },
  { timestamps: true }
);

InvoiceSchema.index({ userId: 1, status: 1 });
InvoiceSchema.index({ userId: 1, dueDate: 1 });
InvoiceSchema.index({ userId: 1, createdAt: -1 });

export const Invoice =
  mongoose.models.Invoice ||
  mongoose.model<IInvoice>("Invoice", InvoiceSchema);
