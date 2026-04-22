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
    "Qualifies leads for Accu-Spina spinal decompression therapy. Scoring rewards MRI-confirmed disc issues, urgency, and self-pay intent; penalizes insurance shoppers and unrelated cases.",
  category: "medical",
  botName: "Athena",
  systemPromptAddendum: "",
  qualificationCriteria: `LEAD SCORING (operator-set rules — apply via newSignals):

STRONG POSITIVE SIGNALS:
- "has_mri" (+25): Patient has an MRI of the affected area (cervical or lumbar). MRI confirmation is the strongest signal we have.
- "urgent_booking" (+12): Patient asks for the next available appointment or wants to start ASAP.
- "has_herniated_disc" (+15): Patient confirms herniated or bulging disc diagnosis.
- "chronic_pain_3plus_months" (+10): Pain has lasted 3+ months.
- "local_to_area" (+8): Patient is in the service area.
- "not_asking_about_insurance" (+5): After 3+ substantive turns, patient has NOT asked about insurance coverage — signals self-pay intent or high motivation.

NEGATIVE SIGNALS:
- "asks_about_insurance" (-5): Patient asks "do you take insurance?" or "is this covered?" — signals shopper mode and reduces likelihood of self-pay conversion.
- "post_surgery" (-10): Already had successful back/spine surgery.
- "unrelated_condition" (-15): Pain is unrelated to discs (broken bone, muscle strain only, etc).
- "not_local" (-10): Outside the service area.
- "just_browsing" (-8): "Just looking", "not ready yet", "curious".

CLASSIFICATION (auto-computed from score; base 40):
- HOT (score >= 70): prime candidate — flag for immediate outreach.
- WARM (45-69): promising, needs nurturing.
- COLD (< 45): unlikely to convert soon.`,
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
