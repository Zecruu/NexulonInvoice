import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { BotConfigForm } from "@/components/whatsapp/bot-config-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function BotConfigPage() {
  const user = await getCurrentUser();
  await dbConnect();

  let config = await WhatsAppBotConfig.findOne({ userId: user._id });
  if (!config) {
    config = await WhatsAppBotConfig.create({ userId: user._id });
  }
  const initial = JSON.parse(JSON.stringify(config.toObject()));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/whatsapp">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bot Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Configure Athena — your Accu-Spina lead qualifier on WhatsApp.
          </p>
        </div>
      </div>

      <BotConfigForm initial={initial} />
    </div>
  );
}
