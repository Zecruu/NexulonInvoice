import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export type InviteRole = "owner" | "admin" | "member";

export interface IInvite extends Document {
  companyId: mongoose.Types.ObjectId;
  email: string;
  role: InviteRole;
  token: string;
  invitedByUserId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedByUserId?: mongoose.Types.ObjectId;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

function generateToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

function defaultExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d;
}

const InviteSchema = new Schema<IInvite>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: generateToken,
    },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date, required: true, default: defaultExpiry },
    acceptedAt: Date,
    acceptedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    revokedAt: Date,
  },
  { timestamps: true }
);

InviteSchema.index({ companyId: 1, email: 1 });

export const Invite =
  mongoose.models.Invite || mongoose.model<IInvite>("Invite", InviteSchema);
