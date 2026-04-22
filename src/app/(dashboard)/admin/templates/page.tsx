import Link from "next/link";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { isAdmin } from "@/lib/admin";
import { BotTemplate, DEFAULT_ACCU_SPINA_TEMPLATE } from "@/models/bot-template";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookTemplate, Plus } from "lucide-react";
import { TemplateActions } from "@/components/admin/template-actions";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) redirect("/dashboard");

  await dbConnect();
  const existing = await BotTemplate.findOne({ slug: DEFAULT_ACCU_SPINA_TEMPLATE.slug });
  if (!existing) await BotTemplate.create(DEFAULT_ACCU_SPINA_TEMPLATE);

  const templates = await BotTemplate.find().sort({ isBuiltIn: -1, name: 1 }).lean();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/bots">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Bot Templates</h1>
          <p className="text-sm text-muted-foreground">
            Reusable prompt + qualification presets. Clone onto any bot.
          </p>
        </div>
        <TemplateActions mode="create-button" />
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <BookTemplate className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No templates yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Slug</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {templates.map((t) => (
                <tr key={String(t._id)} className="hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{t.name}</p>
                      {t.isBuiltIn && (
                        <Badge variant="outline" className="text-[10px]">
                          Built-in
                        </Badge>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {t.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.category || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{t.slug}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/templates/${String(t._id)}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      {!t.isBuiltIn && (
                        <TemplateActions
                          mode="delete"
                          templateId={String(t._id)}
                          name={t.name}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        <Plus className="-mt-0.5 mr-1 inline h-3 w-3" />
        Create a new template by editing one and clicking "Save as new".
      </p>
    </div>
  );
}
