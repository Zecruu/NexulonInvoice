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
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Config {
  botId: string;
  enabled: boolean;
  botName: string;
  businessName: string;
  phoneNumberId: string;
  originationIdentity: string;
  systemPromptAddendum: string;
  qualificationCriteria: string;
  handoffKeywords: string[];
  autoHandoffOnFrustration: boolean;
  autoHandoffOnPricingObjection: boolean;
  bookingUrl?: string;
  templateId?: string | null;
}

interface Template {
  _id: string;
  name: string;
  slug: string;
  description: string;
  isBuiltIn: boolean;
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border p-3">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function AdminBotForm({
  initial,
  templates,
}: {
  initial: Config;
  templates: Template[];
}) {
  const router = useRouter();
  const [config, setConfig] = useState<Config>(initial);
  const [saving, setSaving] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [keywordsText, setKeywordsText] = useState(
    (initial.handoffKeywords || []).join(", ")
  );

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const handoffKeywords = keywordsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/admin/bots/${config.botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, handoffKeywords }),
      });
      if (!res.ok) {
        toast.error("Save failed");
        return;
      }
      toast.success("Saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function applyTemplate() {
    if (!selectedTemplate) return;
    setApplyingTemplate(true);
    try {
      const res = await fetch(
        `/api/admin/bots/${config.botId}/apply-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: selectedTemplate }),
        }
      );
      if (!res.ok) {
        toast.error("Failed to apply template");
        return;
      }
      const data = await res.json();
      const bot = data.bot;
      setConfig(bot);
      setKeywordsText((bot.handoffKeywords || []).join(", "));
      toast.success("Template applied");
      router.refresh();
    } finally {
      setApplyingTemplate(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Clone from template</CardTitle>
          <CardDescription>
            Apply a template's prompt, qualification criteria, and handoff rules.
            This overwrites the current settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Choose a template…" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t._id} value={t._id}>
                  {t.name}
                  {t.isBuiltIn ? " (built-in)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={applyTemplate}
            disabled={!selectedTemplate || applyingTemplate}
          >
            {applyingTemplate ? "Applying…" : "Apply"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            checked={config.enabled}
            onChange={(v) => update("enabled", v)}
            label="Athena enabled"
            hint="When off, inbound messages still record but Athena won't reply."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="botName">Bot name</Label>
            <Input
              id="botName"
              value={config.botName}
              onChange={(e) => update("botName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={config.businessName}
              onChange={(e) => update("businessName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bookingUrl">Booking URL</Label>
            <Input
              id="bookingUrl"
              value={config.bookingUrl || ""}
              onChange={(e) => update("bookingUrl", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AWS / WhatsApp Connection</CardTitle>
          <CardDescription>
            Wire the bot to a specific WhatsApp number in AWS End User Messaging Social.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="phoneNumberId">Phone Number ID (Meta)</Label>
            <Input
              id="phoneNumberId"
              value={config.phoneNumberId}
              onChange={(e) => update("phoneNumberId", e.target.value)}
              placeholder="1062181513649871"
            />
          </div>
          <div>
            <Label htmlFor="originationIdentity">AWS Origination Phone Number ID</Label>
            <Input
              id="originationIdentity"
              value={config.originationIdentity}
              onChange={(e) => update("originationIdentity", e.target.value)}
              placeholder="phone-number-id-…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Qualification & Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="criteria">Qualification criteria</Label>
            <Textarea
              id="criteria"
              value={config.qualificationCriteria}
              onChange={(e) => update("qualificationCriteria", e.target.value)}
              rows={5}
            />
          </div>
          <div>
            <Label htmlFor="addendum">System prompt addendum</Label>
            <Textarea
              id="addendum"
              value={config.systemPromptAddendum}
              onChange={(e) => update("systemPromptAddendum", e.target.value)}
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Human Handoff</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            checked={config.autoHandoffOnFrustration}
            onChange={(v) => update("autoHandoffOnFrustration", v)}
            label="Auto-handoff on frustration"
          />
          <Toggle
            checked={config.autoHandoffOnPricingObjection}
            onChange={(v) => update("autoHandoffOnPricingObjection", v)}
            label="Auto-handoff on pricing objections"
          />
          <div>
            <Label htmlFor="keywords">Handoff keywords (comma-separated)</Label>
            <Textarea
              id="keywords"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save configuration"}
        </Button>
      </div>
    </div>
  );
}
