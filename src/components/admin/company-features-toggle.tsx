"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setCompanyInvoicing } from "@/actions/admin-actions";

export function CompanyFeaturesToggle({
  companyId,
  initialInvoicesEnabled,
}: {
  companyId: string;
  initialInvoicesEnabled: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialInvoicesEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    setEnabled(next);
    const r = await setCompanyInvoicing(companyId, next);
    setSaving(false);
    if (r.error) {
      setEnabled(!next);
      toast.error(r.error);
      return;
    }
    toast.success(
      next ? "Invoicing enabled for this company" : "Invoicing disabled"
    );
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between rounded-md border p-4">
      <div>
        <p className="text-sm font-medium">Invoicing module</p>
        <p className="text-xs text-muted-foreground">
          When enabled, members of this company see Invoices, Subscriptions, and
          Clients in the sidebar. Disabled = WhatsApp only.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-60 ${
          enabled ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
