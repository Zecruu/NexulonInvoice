"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface Template {
  _id: string;
  name: string;
  description: string;
  category: string;
  botName: string;
  systemPromptAddendum: string;
  qualificationCriteria: string;
  handoffKeywords: string[];
  autoHandoffOnFrustration: boolean;
  autoHandoffOnPricingObjection: boolean;
  isBuiltIn: boolean;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function TemplateEditForm({ initial }: { initial: Template }) {
  const router = useRouter();
  const [t, setT] = useState<Template>(initial);
  const [keywordsText, setKeywordsText] = useState(
    (initial.handoffKeywords || []).join(", ")
  );
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Template>(key: K, value: Template[K]) {
    setT((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const handoffKeywords = keywordsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/admin/templates/${t._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...t, handoffKeywords }),
      });
      if (!res.ok) {
        toast.error("Save failed");
        return;
      }
      toast.success("Template saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function saveAsNew() {
    setSaving(true);
    try {
      const handoffKeywords = keywordsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${t.name} (copy)`,
          description: t.description,
          category: t.category,
          botName: t.botName,
          systemPromptAddendum: t.systemPromptAddendum,
          qualificationCriteria: t.qualificationCriteria,
          handoffKeywords,
          autoHandoffOnFrustration: t.autoHandoffOnFrustration,
          autoHandoffOnPricingObjection: t.autoHandoffOnPricingObjection,
        }),
      });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      const data = await res.json();
      toast.success("Saved as new template");
      router.push(`/admin/templates/${data.template._id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={t.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              value={t.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cat">Category</Label>
            <Input
              id="cat"
              value={t.category}
              onChange={(e) => update("category", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bn">Default bot name</Label>
            <Input
              id="bn"
              value={t.botName}
              onChange={(e) => update("botName", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="qc">Qualification criteria</Label>
            <Textarea
              id="qc"
              rows={5}
              value={t.qualificationCriteria}
              onChange={(e) => update("qualificationCriteria", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sp">System prompt addendum</Label>
            <Textarea
              id="sp"
              rows={5}
              value={t.systemPromptAddendum}
              onChange={(e) => update("systemPromptAddendum", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Handoff defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            checked={t.autoHandoffOnFrustration}
            onChange={(v) => update("autoHandoffOnFrustration", v)}
            label="Auto-handoff on frustration"
          />
          <Toggle
            checked={t.autoHandoffOnPricingObjection}
            onChange={(v) => update("autoHandoffOnPricingObjection", v)}
            label="Auto-handoff on pricing objections"
          />
          <div>
            <Label htmlFor="kw">Handoff keywords (comma-separated)</Label>
            <Textarea
              id="kw"
              rows={2}
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={saveAsNew} disabled={saving}>
          Save as new
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
