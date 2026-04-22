"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Signal {
  rule: string;
  delta: number;
  evidence: string;
  timestamp: string | Date;
}

function prettyRule(rule: string): string {
  return rule
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LeadSignalsDialog({
  name,
  score,
  signals,
}: {
  name: string;
  score: number;
  signals: Signal[];
}) {
  const [open, setOpen] = useState(false);
  const positives = signals.filter((s) => s.delta > 0);
  const negatives = signals.filter((s) => s.delta < 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <Eye className="mr-1 h-3 w-3" />
          <span className="text-xs">Details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            Current score: <span className="font-mono font-semibold">{score}</span>
            {" · "}
            base 40 + {signals.reduce((a, s) => a + s.delta, 0)} from {signals.length} signal
            {signals.length === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        {signals.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No signals yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                Positive ({positives.length})
              </h4>
              {positives.length === 0 ? (
                <p className="text-xs text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-2">
                  {positives.map((s, i) => (
                    <li key={i} className="rounded-md border bg-emerald-50/50 p-2 dark:bg-emerald-950/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{prettyRule(s.rule)}</span>
                        <span className="font-mono text-xs font-bold text-emerald-700">
                          +{s.delta}
                        </span>
                      </div>
                      {s.evidence && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground">
                          &ldquo;{s.evidence}&rdquo;
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(s.timestamp), { addSuffix: true })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-red-600">
                <TrendingDown className="h-3.5 w-3.5" />
                Negative ({negatives.length})
              </h4>
              {negatives.length === 0 ? (
                <p className="text-xs text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-2">
                  {negatives.map((s, i) => (
                    <li key={i} className="rounded-md border bg-red-50/50 p-2 dark:bg-red-950/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{prettyRule(s.rule)}</span>
                        <span className="font-mono text-xs font-bold text-red-700">
                          {s.delta}
                        </span>
                      </div>
                      {s.evidence && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground">
                          &ldquo;{s.evidence}&rdquo;
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(s.timestamp), { addSuffix: true })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
