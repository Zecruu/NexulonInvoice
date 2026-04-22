"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Mode = "create-button" | "delete";

export function TemplateActions({
  mode,
  templateId,
  name,
}: {
  mode: Mode;
  templateId?: string;
  name?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "general",
    systemPromptAddendum: "",
    qualificationCriteria: "",
    handoffKeywords: "human, agent, manager",
  });

  async function create() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          handoffKeywords: form.handoffKeywords
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        toast.error("Failed to create");
        return;
      }
      toast.success("Template created");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!templateId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg || "Delete failed");
        return;
      }
      toast.success("Template deleted");
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  if (mode === "create-button") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New template
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create template</DialogTitle>
            <DialogDescription>
              Fill in the basics. You can refine the prompt after creating.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="tn">Name</Label>
              <Input
                id="tn"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Dental Consultation Qualifier"
              />
            </div>
            <div>
              <Label htmlFor="td">Description</Label>
              <Input
                id="td"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="tc">Category</Label>
              <Input
                id="tc"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="medical, dental, legal, etc."
              />
            </div>
            <div>
              <Label htmlFor="tq">Qualification criteria</Label>
              <Textarea
                id="tq"
                rows={4}
                value={form.qualificationCriteria}
                onChange={(e) =>
                  setForm({ ...form, qualificationCriteria: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="ta">Prompt addendum</Label>
              <Textarea
                id="ta"
                rows={4}
                value={form.systemPromptAddendum}
                onChange={(e) =>
                  setForm({ ...form, systemPromptAddendum: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="tk">Handoff keywords (comma-separated)</Label>
              <Textarea
                id="tk"
                rows={2}
                value={form.handoffKeywords}
                onChange={(e) =>
                  setForm({ ...form, handoffKeywords: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving || !form.name.trim()}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete template"
        description={`Permanently delete "${name}"? Bots using this template keep their current settings.`}
        confirmLabel="Delete"
        onConfirm={doDelete}
        loading={deleting}
      />
    </>
  );
}
