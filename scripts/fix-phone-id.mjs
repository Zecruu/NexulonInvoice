import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://Zecru:Redzone12@nexuloninvoicemongo.vx7ildk.mongodb.net/nexulon-invoice?appName=NexulonInvoiceMongo";

const schema = new mongoose.Schema({}, { strict: false, collection: "whatsappbotconfigs" });
const BotConfig = mongoose.model("WhatsAppBotConfig", schema);

(async () => {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const res = await BotConfig.updateMany(
    { phoneNumberId: "1377581514429290" },
    { $set: { phoneNumberId: "1062181513649871" } }
  );
  console.log("matched:", res.matchedCount, "modified:", res.modifiedCount);
  await mongoose.disconnect();
})();
