import mongoose, { Schema, Document } from "mongoose";

export interface IClient extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  contactPerson?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    contactPerson: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    notes: String,
  },
  { timestamps: true }
);

ClientSchema.index({ userId: 1, name: 1 });

export const Client =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
