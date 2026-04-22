import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { isAdmin } from "@/lib/admin";
import { BotTemplate } from "@/models/bot-template";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TemplateEditForm } from "@/components/admin/template-edit-form";

export const dynamic = "force-dynamic";

export default async function AdminTemplateEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) redirect("/dashboard");

  await dbConnect();
  const template = await BotTemplate.findById(id);
  if (!template) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{template.name}</h1>
          <p className="text-sm text-muted-foreground font-mono text-xs">
            {template.slug}
            {template.isBuiltIn ? " · built-in" : ""}
          </p>
        </div>
      </div>

      <TemplateEditForm
        initial={JSON.parse(JSON.stringify(template.toObject()))}
      />
    </div>
  );
}
