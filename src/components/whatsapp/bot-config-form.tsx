"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

interface Config {
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

export function BotConfigForm({ initial }: { initial: Config }) {
  const [config, setConfig] = useState<Config>(initial);
  const [saving, setSaving] = useState(false);
  const [keywordsText, setKeywordsText] = useState((initial.handoffKeywords || []).join(", "));

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

      const res = await fetch("/api/whatsapp/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, handoffKeywords }),
      });

      if (!res.ok) {
        toast.error("Save failed");
        return;
      }
      toast.success("Saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Turn Athena on or off.</CardDescription>
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
          <CardDescription>How Athena introduces itself.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="botName">Bot name</Label>
            <Input
              id="botName"
              value={config.botName}
              onChange={(e) => update("botName", e.target.value)}
              placeholder="Athena"
            />
          </div>
          <div>
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={config.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              placeholder="e.g. Nexulon Spine Center"
            />
          </div>
          <div>
            <Label htmlFor="bookingUrl">Booking URL (optional)</Label>
            <Input
              id="bookingUrl"
              value={config.bookingUrl || ""}
              onChange={(e) => update("bookingUrl", e.target.value)}
              placeholder="https://…/book"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp / AWS Connection</CardTitle>
          <CardDescription>
            Link this bot to a specific WhatsApp business number in AWS End User Messaging
            Social. Both values come from AWS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="phoneNumberId">Phone Number ID (Meta)</Label>
            <Input
              id="phoneNumberId"
              value={config.phoneNumberId}
              onChange={(e) => update("phoneNumberId", e.target.value)}
              placeholder="e.g. 123456789012345"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Numeric ID of the WhatsApp business number. Inbound messages are routed
              to the correct user's bot using this ID.
            </p>
          </div>
          <div>
            <Label htmlFor="originationIdentity">AWS Origination Identity ARN</Label>
            <Input
              id="originationIdentity"
              value={config.originationIdentity}
              onChange={(e) => update("originationIdentity", e.target.value)}
              placeholder="arn:aws:social-messaging:…:phone-number-id/…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Qualification</CardTitle>
          <CardDescription>
            Guide Athena's judgment about hot/warm/cold leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="criteria">Extra qualification criteria</Label>
            <Textarea
              id="criteria"
              value={config.qualificationCriteria}
              onChange={(e) => update("qualificationCriteria", e.target.value)}
              placeholder="e.g. Must be located in Puerto Rico. Prefer patients with MRI confirmation."
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="addendum">Extra system prompt instructions</Label>
            <Textarea
              id="addendum"
              value={config.systemPromptAddendum}
              onChange={(e) => update("systemPromptAddendum", e.target.value)}
              placeholder="e.g. Always mention our free consultation offer. Office hours are 9am–6pm."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Human Handoff</CardTitle>
          <CardDescription>When Athena should step aside for a human.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            checked={config.autoHandoffOnFrustration}
            onChange={(v) => update("autoHandoffOnFrustration", v)}
            label="Auto-handoff on frustration"
            hint="Athena transfers to human when it detects anger or repeated failed replies."
          />
          <Toggle
            checked={config.autoHandoffOnPricingObjection}
            onChange={(v) => update("autoHandoffOnPricingObjection", v)}
            label="Auto-handoff on pricing objections"
            hint="Transfer to human when customer pushes back on cost."
          />
          <div>
            <Label htmlFor="keywords">Handoff keywords (comma-separated)</Label>
            <Textarea
              id="keywords"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              rows={2}
              placeholder="human, agent, manager, representante, hablar con alguien"
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
