import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://Zecru:Redzone12@nexuloninvoicemongo.vx7ildk.mongodb.net/nexulon-invoice?appName=NexulonInvoiceMongo";

const schema = new mongoose.Schema({}, { strict: false, collection: "whatsappbotconfigs" });
const BotConfig = mongoose.model("WhatsAppBotConfig", schema);

(async () => {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const all = await BotConfig.find({}).lean();
  console.log("Found", all.length, "bot configs:");
  for (const b of all) {
    console.log(
      `  botId=${b.botId ?? "(missing)"} userId=${b.userId} phoneNumberId=${b.phoneNumberId || "—"} enabled=${b.enabled}`
    );
  }
  await mongoose.disconnect();
})();
