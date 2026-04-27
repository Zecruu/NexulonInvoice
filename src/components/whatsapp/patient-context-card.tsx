import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, AlertCircle } from "lucide-react";

interface PatientContext {
  painLevel?: number;
  painLocation?: string;
  painDuration?: string;
  hasMRI?: boolean;
  diagnosis?: string;
  priorTreatments?: string[];
  urgency?: string;
  hasInsurance?: boolean;
  location?: string;
  intakeSummary?: string;
  lastUpdated?: string | Date;
}

function painLevelColor(level?: number) {
  if (level === undefined || level === null) return "bg-muted text-muted-foreground";
  if (level >= 8) return "bg-red-500/15 text-red-600 dark:text-red-400";
  if (level >= 5) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
}

function YesNoBadge({ value }: { value?: boolean }) {
  if (value === undefined || value === null) {
    return <span className="text-xs text-muted-foreground">Not asked</span>;
  }
  return (
    <Badge variant={value ? "default" : "secondary"} className="text-[10px]">
      {value ? "Yes" : "No"}
    </Badge>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

export function PatientContextCard({ context }: { context?: PatientContext | null }) {
  const ctx = context || {};
  const hasAnything =
    ctx.painLevel !== undefined ||
    ctx.painLocation ||
    ctx.painDuration ||
    ctx.hasMRI !== undefined ||
    ctx.diagnosis ||
    (ctx.priorTreatments && ctx.priorTreatments.length > 0) ||
    ctx.urgency ||
    ctx.hasInsurance !== undefined ||
    ctx.location ||
    ctx.intakeSummary;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClipboardList className="h-4 w-4" />
          Patient Intake
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnything ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5" />
            Athena hasn&apos;t gathered information yet. Form will populate as the
            conversation progresses.
          </div>
        ) : (
          <>
            {ctx.intakeSummary && (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Athena&apos;s Summary
                </p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                  {ctx.intakeSummary}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pain Level">
                {ctx.painLevel !== undefined ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-sm font-bold ${painLevelColor(
                      ctx.painLevel
                    )}`}
                  >
                    {ctx.painLevel}/10
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Not asked</span>
                )}
              </Field>

              <Field label="Urgency">
                {ctx.urgency ? (
                  <Badge
                    variant={
                      ctx.urgency === "high"
                        ? "destructive"
                        : ctx.urgency === "medium"
                        ? "default"
                        : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {ctx.urgency}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </Field>

              <Field label="Pain Location">
                <span>{ctx.painLocation || <span className="text-muted-foreground">—</span>}</span>
              </Field>

              <Field label="Duration">
                <span>{ctx.painDuration || <span className="text-muted-foreground">—</span>}</span>
              </Field>

              <Field label="Diagnosis">
                <span>{ctx.diagnosis || <span className="text-muted-foreground">—</span>}</span>
              </Field>

              <Field label="Has MRI">
                <YesNoBadge value={ctx.hasMRI} />
              </Field>

              <Field label="Has Insurance">
                <YesNoBadge value={ctx.hasInsurance} />
              </Field>

              <Field label="Location">
                <span>{ctx.location || <span className="text-muted-foreground">—</span>}</span>
              </Field>
            </div>

            {ctx.priorTreatments && ctx.priorTreatments.length > 0 && (
              <Field label="Prior Treatments">
                <div className="flex flex-wrap gap-1">
                  {ctx.priorTreatments.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </Field>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
