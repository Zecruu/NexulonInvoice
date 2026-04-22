import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { isAdmin } from "@/lib/admin";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { User } from "@/models/user";
import { BotTemplate, DEFAULT_ACCU_SPINA_TEMPLATE } from "@/models/bot-template";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AdminBotForm } from "@/components/admin/bot-form";

export const dynamic = "force-dynamic";

export default async function AdminBotDetail({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;
  const currentUser = await getCurrentUser();
  if (!isAdmin(currentUser.email)) redirect("/dashboard");

  await dbConnect();

  const existing = await BotTemplate.findOne({
    slug: DEFAULT_ACCU_SPINA_TEMPLATE.slug,
  });
  if (!existing) {
    await BotTemplate.create(DEFAULT_ACCU_SPINA_TEMPLATE);
  }

  const bot = await WhatsAppBotConfig.findOne({ botId }).populate({
    path: "userId",
    select: "email firstName lastName businessName",
    model: User,
  });
  if (!bot) notFound();

  const templates = await BotTemplate.find().sort({ isBuiltIn: -1, name: 1 }).lean();

  const serialized = JSON.parse(JSON.stringify(bot.toObject()));
  const u = serialized.userId as {
    email?: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
  } | null;
  const accountName =
    u?.businessName ||
    [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
    u?.email ||
    "—";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/bots">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{accountName}</h1>
          <p className="text-sm text-muted-foreground">
            Bot ID: <span className="font-mono">{bot.botId}</span>
            {u?.email ? ` · ${u.email}` : ""}
          </p>
        </div>
      </div>

      <AdminBotForm
        initial={serialized}
        templates={JSON.parse(JSON.stringify(templates))}
      />
    </div>
  );
}
