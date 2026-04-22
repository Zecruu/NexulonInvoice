import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://Zecru:Redzone12@nexuloninvoicemongo.vx7ildk.mongodb.net/nexulon-invoice?appName=NexulonInvoiceMongo";

const BOT_ID = process.argv[2] || "bot_731f410329b3";

const CRITERIA = `LEAD SCORING (operator-set rules — apply via newSignals):

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
- COLD (< 45): unlikely to convert soon.`;

import crypto from "crypto";

function generateBotId() {
  return `bot_${crypto.randomBytes(6).toString("hex")}`;
}

const schema = new mongoose.Schema({}, { strict: false, collection: "whatsappbotconfigs" });
const BotConfig = mongoose.model("WhatsAppBotConfig", schema);

(async () => {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const all = await BotConfig.find({}).lean();
  for (const bot of all) {
    const update = {
      qualificationCriteria: CRITERIA,
      businessName: "Nexulon Spine Center",
    };
    if (!bot.botId) {
      update.botId = generateBotId();
    }
    await BotConfig.updateOne({ _id: bot._id }, { $set: update });
    console.log(
      `Updated ${bot._id} → botId=${update.botId || bot.botId}, phoneNumberId=${bot.phoneNumberId || "—"}`
    );
  }
  await mongoose.disconnect();
})();
