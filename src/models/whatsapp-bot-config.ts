import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IWhatsAppBotConfig extends Document {
  userId: mongoose.Types.ObjectId;
  botId: string;
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
  templateId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

function generateBotId(): string {
  return `bot_${crypto.randomBytes(6).toString("hex")}`;
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
    botId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: generateBotId,
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
    templateId: { type: Schema.Types.ObjectId, ref: "BotTemplate" },
  },
  { timestamps: true }
);

export const WhatsAppBotConfig =
  mongoose.models.WhatsAppBotConfig ||
  mongoose.model<IWhatsAppBotConfig>(
    "WhatsAppBotConfig",
    WhatsAppBotConfigSchema
  );
