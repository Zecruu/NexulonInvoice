import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  businessLogo?: string;
  defaultCurrency: string;
  defaultTaxRate: number;
  tier: "free" | "pro";
  tierUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    imageUrl: String,
    businessName: String,
    businessEmail: String,
    businessPhone: String,
    businessAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    businessLogo: String,
    defaultCurrency: { type: String, default: "USD" },
    defaultTaxRate: { type: Number, default: 0 },
    tier: { type: String, enum: ["free", "pro"], default: "free" },
    tierUpdatedAt: Date,
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
