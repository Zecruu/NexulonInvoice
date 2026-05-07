"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
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

  const allChecked = leads.length > 0 && selected.size === leads.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l._id)));
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
            ? `${leads.length} lead${leads.length === 1 ? "" : "s"}`
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
                  aria-label="Select all"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer"
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
              return (
                <tr
                  key={l._id}
                  className={
                    isChecked ? "bg-accent/50" : "hover:bg-accent/30"
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
                    <Link
                      href={`/whatsapp/${encodeURIComponent(l.waPhone)}`}
                      className="font-medium hover:underline"
                    >
                      {l.name || l.waPhone}
                    </Link>
                    {l.name && (
                      <p className="text-xs text-muted-foreground">{l.waPhone}</p>
                    )}
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
