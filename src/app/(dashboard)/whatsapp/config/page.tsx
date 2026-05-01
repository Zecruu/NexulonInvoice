import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-user";
import { isAdmin } from "@/lib/admin";
import dbConnect from "@/lib/db";
import { getOrCreateBotConfig } from "@/lib/whatsapp/bot-config";
import { BotConfigForm } from "@/components/whatsapp/bot-config-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function BotConfigPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) redirect(`/whatsapp`);
  await dbConnect();

  const config = await getOrCreateBotConfig(user);
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
