import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppBotConfig extends Document {
  userId: mongoose.Types.ObjectId;
  enabled: boolean;
  botName: string;
  businessName: string;
  phoneNumberId: string;
  originationIdentity: string;
  systemPromptAddendum: string;
  qualificationCriteria: string;
  handoffKeywords: string[];
  autoHandoffOnFrustration: boolean;
  autoHandoffOnPricingObjection: boolean;
  bookingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppBotConfigSchema = new Schema<IWhatsAppBotConfig>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    enabled: { type: Boolean, default: true },
    botName: { type: String, default: "Athena" },
    businessName: { type: String, default: "" },
    phoneNumberId: { type: String, default: "" },
    originationIdentity: { type: String, default: "" },
    systemPromptAddendum: { type: String, default: "" },
    qualificationCriteria: { type: String, default: "" },
    handoffKeywords: {
      type: [String],
      default: [
        "human",
        "agent",
        "representative",
        "manager",
        "persona",
        "representante",
        "humano",
        "hablar con alguien",
      ],
    },
    autoHandoffOnFrustration: { type: Boolean, default: true },
    autoHandoffOnPricingObjection: { type: Boolean, default: false },
    bookingUrl: String,
  },
  { timestamps: true }
);

export const WhatsAppBotConfig =
  mongoose.models.WhatsAppBotConfig ||
  mongoose.model<IWhatsAppBotConfig>(
    "WhatsAppBotConfig",
    WhatsAppBotConfigSchema
  );
