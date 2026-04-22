import mongoose, { Schema, Document } from "mongoose";

export type LeadTemperature = "hot" | "warm" | "cold";
export type LeadStatus =
  | "new"
  | "contacted"
  | "booked"
  | "consulted"
  | "converted"
  | "lost";

export interface ILeadSignal {
  rule: string;
  delta: number;
  evidence: string;
  timestamp: Date;
}

export interface ILead extends Document {
  userId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  waPhone: string;
  name?: string;
  temperature: LeadTemperature;
  status: LeadStatus;
  painDuration?: string;
  diagnosis?: string;
  urgency?: string;
  hasInsurance?: boolean;
  location?: string;
  summary: string;
  score: number;
  signals: ILeadSignal[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppConversation",
      required: true,
      index: true,
    },
    waPhone: { type: String, required: true, index: true },
    name: String,
    temperature: {
      type: String,
      enum: ["hot", "warm", "cold"],
      default: "warm",
      index: true,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "booked", "consulted", "converted", "lost"],
      default: "new",
      index: true,
    },
    painDuration: String,
    diagnosis: String,
    urgency: String,
    hasInsurance: Boolean,
    location: String,
    summary: { type: String, default: "" },
    score: { type: Number, default: 0 },
    signals: {
      type: [
        new Schema<ILeadSignal>(
          {
            rule: { type: String, required: true },
            delta: { type: Number, required: true },
            evidence: { type: String, default: "" },
            timestamp: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    notes: String,
  },
  { timestamps: true }
);

LeadSchema.index({ userId: 1, temperature: 1, createdAt: -1 });
LeadSchema.index({ userId: 1, status: 1 });

export const Lead =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
