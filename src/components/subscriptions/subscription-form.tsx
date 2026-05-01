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
import { Plus, Trash2 } from "lucide-react";
import { createSubscription } from "@/actions/subscription-actions";

interface ClientOption {
  _id: string;
  name: string;
  email?: string;
}

interface LineItemDraft {
  description: string;
  quantity: number;
  unitPrice: number;
}

export function SubscriptionForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [label, setLabel] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDays, setDueDays] = useState(7);
  const [autoSend, setAutoSend] = useState(true);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  function updateItem(idx: number, patch: Partial<LineItemDraft>) {
    setLineItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  }
  function addItem() {
    setLineItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0 },
    ]);
  }
  function removeItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = lineItems.reduce(
    (s, it) => s + it.quantity * it.unitPrice,
    0
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  async function submit() {
    if (!clientId) {
      toast.error("Pick a client");
      return;
    }
    if (lineItems.some((it) => !it.description || it.quantity < 1 || it.unitPrice < 0)) {
      toast.error("All line items need a description, quantity ≥ 1, and a non-negative price");
      return;
    }
    setSaving(true);
    try {
      const r = await createSubscription({
        clientId,
        lineItems,
        taxRate,
        currency: "USD",
        notes: notes || undefined,
        frequency,
        startDate,
        dueDays,
        autoSend,
        label: label || undefined,
      });
      toast.success("Subscription created");
      router.push(`/subscriptions/${r.subscriptionId}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription details</CardTitle>
          <CardDescription>
            The template that future invoices will copy from.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cl">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="cl">
                <SelectValue placeholder="Select a client…" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name} {c.email ? `· ${c.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="label">Label (optional)</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Monthly retainer"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="freq">Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as "monthly" | "yearly")}
              >
                <SelectTrigger id="freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="start">First invoice date</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="due">Due in (days)</Label>
              <Input
                id="due"
                type="number"
                min={0}
                value={dueDays}
                onChange={(e) => setDueDays(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Auto-send by email</p>
              <p className="text-xs text-muted-foreground">
                Email the client each cycle (uses your verified Resend domain).
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSend}
              onClick={() => setAutoSend((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                autoSend ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
                  autoSend ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input
                className="col-span-7"
                placeholder="Description"
                value={it.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
              />
              <Input
                className="col-span-2"
                type="number"
                min={1}
                placeholder="Qty"
                value={it.quantity}
                onChange={(e) =>
                  updateItem(i, { quantity: parseInt(e.target.value) || 1 })
                }
              />
              <Input
                className="col-span-2"
                type="number"
                min={0}
                step="0.01"
                placeholder="Unit $"
                value={it.unitPrice}
                onChange={(e) =>
                  updateItem(i, { unitPrice: parseFloat(e.target.value) || 0 })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(i)}
                disabled={lineItems.length === 1}
                className="col-span-1"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add line item
          </Button>

          <div className="border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="tax">Tax rate (%)</Label>
                <Input
                  id="tax"
                  type="number"
                  min={0}
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-mono">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total per cycle</span>
              <span className="font-mono">${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes that appear on each invoice"
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={saving || !clientId}>
          {saving ? "Creating…" : "Create subscription"}
        </Button>
      </div>
    </div>
  );
}
