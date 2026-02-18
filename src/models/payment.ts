import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  invoiceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  paymentMethod?: string;
  receiptUrl?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stripeSessionId: { type: String, required: true, unique: true },
    stripePaymentIntentId: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: String,
    receiptUrl: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export const Payment =
  mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", PaymentSchema);
