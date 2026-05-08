"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Forward as ForwardIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LeadSignalsDialog } from "@/components/whatsapp/lead-signals-dialog";
import { ForwardLeadsDialog } from "@/components/whatsapp/forward-leads-dialog";

interface LeadRow {
  _id: string;
  name?: string;
  waPhone: string;
  temperature: "hot" | "warm" | "cold";
  status: string;
  summary?: string;
  score: number;
  createdAt: string;
  lastForwardedAt?: string;
  signals: Array<{
    rule: string;
    delta: number;
    evidence: string;
    timestamp: string;
  }>;
}

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Already-forwarded leads are excluded from select-all (you'd usually only
  // want to bundle fresh ones), but the user can still tick them individually.
  const unforwardedIds = useMemo(
    () => leads.filter((l) => !l.lastForwardedAt).map((l) => l._id),
    [leads]
  );
  const allUnforwardedChecked =
    unforwardedIds.length > 0 &&
    unforwardedIds.every((id) => selected.has(id));
  const anyUnforwardedChecked = unforwardedIds.some((id) =>
    selected.has(id)
  );
  const someChecked =
    anyUnforwardedChecked && !allUnforwardedChecked;

  function toggleAll() {
    if (allUnforwardedChecked) {
      // Unselect only the unforwarded ones (preserve any forwarded leads the
      // user manually ticked)
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of unforwardedIds) next.delete(id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of unforwardedIds) next.add(id);
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const summary = useMemo(() => {
    if (selected.size === 0) return "selected";
    const picked = leads.filter((l) => selected.has(l._id));
    const tempCounts = picked.reduce<Record<string, number>>((acc, l) => {
      acc[l.temperature] = (acc[l.temperature] || 0) + 1;
      return acc;
    }, {});
    const breakdown = ["hot", "warm", "cold"]
      .filter((t) => tempCounts[t])
      .map((t) => `${tempCounts[t]} ${t}`)
      .join(", ");
    return `${picked.length} selected (${breakdown})`;
  }, [selected, leads]);

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No leads match your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
        <p className="text-sm text-muted-foreground">
          {selected.size === 0
            ? `${leads.length} lead${leads.length === 1 ? "" : "s"}${
                unforwardedIds.length < leads.length
                  ? ` · ${leads.length - unforwardedIds.length} already forwarded`
                  : ""
              }`
            : summary}
        </p>
        <ForwardLeadsDialog
          selectedLeadIds={Array.from(selected)}
          selectedSummary={
            selected.size === 1
              ? "1 lead"
              : `${selected.size} leads`
          }
          onForwarded={() => {
            setSelected(new Set());
            router.refresh();
          }}
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Select all not-yet-forwarded"
                  checked={allUnforwardedChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={toggleAll}
                  disabled={unforwardedIds.length === 0}
                  className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  title={
                    unforwardedIds.length === 0
                      ? "All leads have already been forwarded"
                      : `Select ${unforwardedIds.length} not-yet-forwarded lead${unforwardedIds.length === 1 ? "" : "s"}`
                  }
                />
              </th>
              <th className="px-4 py-2 font-medium">Name / Phone</th>
              <th className="px-4 py-2 font-medium">Temp</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Summary</th>
              <th className="px-4 py-2 font-medium">Score</th>
              <th className="px-4 py-2 font-medium">Signals</th>
              <th className="px-4 py-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.map((l) => {
              const isChecked = selected.has(l._id);
              const wasForwarded = !!l.lastForwardedAt;
              return (
                <tr
                  key={l._id}
                  className={
                    isChecked
                      ? "bg-accent/50"
                      : wasForwarded
                        ? "opacity-70 hover:bg-accent/30 hover:opacity-100"
                        : "hover:bg-accent/30"
                  }
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${l.name || l.waPhone}`}
                      checked={isChecked}
                      onChange={() => toggleOne(l._id)}
                      className="h-4 w-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/whatsapp/${encodeURIComponent(l.waPhone)}`}
                        className="font-medium hover:underline"
                      >
                        {l.name || "(no name yet)"}
                      </Link>
                      {wasForwarded && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                          title={`Forwarded ${formatDistanceToNow(new Date(l.lastForwardedAt!), { addSuffix: true })}`}
                        >
                          <ForwardIcon className="h-2.5 w-2.5" />
                          forwarded
                        </span>
                      )}
                    </div>
                    <a
                      href={`tel:${l.waPhone}`}
                      className="mt-0.5 inline-block select-all font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {l.waPhone}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        l.temperature === "hot"
                          ? "destructive"
                          : l.temperature === "warm"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {l.temperature}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{l.status}</Badge>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="line-clamp-2 text-muted-foreground">
                      {l.summary}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={
                            l.score >= 70
                              ? "h-full bg-red-500"
                              : l.score >= 45
                                ? "h-full bg-amber-500"
                                : "h-full bg-sky-500"
                          }
                          style={{
                            width: `${Math.min(100, Math.max(0, l.score))}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono text-xs">{l.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <LeadSignalsDialog
                      name={l.name || l.waPhone}
                      score={l.score}
                      signals={l.signals}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(l.createdAt), {
                      addSuffix: true,
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
