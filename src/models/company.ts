import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface ICompany extends Document {
  companyId: string; // human-readable identifier shared with members
  name: string;
  slug: string;
  ownerUserId?: mongoose.Types.ObjectId;
  brandLogo?: string;
  brandPrimaryColor?: string;
  createdAt: Date;
  updatedAt: Date;
}

function generateCompanyId(): string {
  // 8 hex chars, prefixed for readability — e.g. co_a1b2c3d4
  return `co_${crypto.randomBytes(4).toString("hex")}`;
}

const CompanySchema = new Schema<ICompany>(
  {
    companyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: generateCompanyId,
    },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    brandLogo: String,
    brandPrimaryColor: String,
  },
  { timestamps: true }
);

export const Company =
  mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema);
