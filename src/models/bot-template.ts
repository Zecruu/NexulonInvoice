import mongoose, { Schema, Document } from "mongoose";

export interface IBotTemplate extends Document {
  name: string;
  slug: string;
  description: string;
  category: string;
  botName: string;
  systemPromptAddendum: string;
  qualificationCriteria: string;
  handoffKeywords: string[];
  autoHandoffOnFrustration: boolean;
  autoHandoffOnPricingObjection: boolean;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BotTemplateSchema = new Schema<IBotTemplate>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    category: { type: String, default: "general" },
    botName: { type: String, default: "Athena" },
    systemPromptAddendum: { type: String, default: "" },
    qualificationCriteria: { type: String, default: "" },
    handoffKeywords: {
      type: [String],
      default: [
        "human",
        "agent",
        "manager",
        "representante",
        "hablar con alguien",
      ],
    },
    autoHandoffOnFrustration: { type: Boolean, default: true },
    autoHandoffOnPricingObjection: { type: Boolean, default: false },
    isBuiltIn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const BotTemplate =
  mongoose.models.BotTemplate ||
  mongoose.model<IBotTemplate>("BotTemplate", BotTemplateSchema);

export const DEFAULT_ACCU_SPINA_TEMPLATE = {
  name: "Accu-Spina Lead Qualifier",
  slug: "accu-spina-lead-qualifier",
  description:
    "Qualifies leads for Accu-Spina spinal decompression therapy. Asks about disc diagnosis, pain duration, prior treatments, location, and insurance. Scores hot/warm/cold.",
  category: "medical",
  botName: "Athena",
  systemPromptAddendum: "",
  qualificationCriteria:
    "HOT LEAD = disc-related diagnosis (herniated/bulging disc, sciatica, stenosis) + chronic pain (>3 months) + motivated + local.\nWARM LEAD = partial match (some pain but unclear diagnosis).\nCOLD LEAD = unrelated condition, not local, post-surgical, or just browsing.",
  handoffKeywords: [
    "human",
    "agent",
    "representative",
    "manager",
    "doctor",
    "persona",
    "representante",
    "humano",
    "hablar con alguien",
    "quiero hablar",
    "speak to someone",
  ],
  autoHandoffOnFrustration: true,
  autoHandoffOnPricingObjection: false,
  isBuiltIn: true,
};
