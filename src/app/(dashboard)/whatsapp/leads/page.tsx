import Link from "next/link";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { Lead } from "@/models/lead";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame, Snowflake, Thermometer, Users } from "lucide-react";
import { LeadsTable } from "@/components/whatsapp/leads-table";
import { LeadsSearch } from "@/components/whatsapp/leads-search";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Temp = "hot" | "warm" | "cold" | "all";
type Status =
  | "all"
  | "new"
  | "contacted"
  | "booked"
  | "consulted"
  | "converted"
  | "lost";

const STATUSES: Status[] = [
  "all",
  "new",
  "contacted",
  "booked",
  "consulted",
  "converted",
  "lost",
];

function buildHref(
  base: Record<string, string | undefined>,
  override: Record<string, string | undefined>
) {
  const merged = { ...base, ...override };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v && v !== "all") params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/whatsapp/leads?${qs}` : "/whatsapp/leads";
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    temperature?: string;
    status?: string;
    search?: string;
  }>;
}) {
  const sp = await searchParams;
  const temperature = (sp.temperature as Temp) || "all";
  const status = (sp.status as Status) || "all";
  const search = sp.search?.trim() || "";

  const user = await getCurrentUser();
  await dbConnect();

  const baseScope = user.companyId
    ? { companyId: user.companyId }
    : { userId: user._id };

  // Always fetch counts on the unfiltered (within scope) set so the stat tiles
  // reflect totals, not the filtered view.
  const [hotCount, warmCount, coldCount, totalCount] = await Promise.all([
    Lead.countDocuments({ ...baseScope, temperature: "hot" }),
    Lead.countDocuments({ ...baseScope, temperature: "warm" }),
    Lead.countDocuments({ ...baseScope, temperature: "cold" }),
    Lead.countDocuments(baseScope),
  ]);

  const query: Record<string, unknown> = { ...baseScope };
  if (temperature !== "all") query.temperature = temperature;
  if (status !== "all") query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { waPhone: { $regex: search, $options: "i" } },
    ];
  }

  const leads = await Lead.find(query)
    .sort({ score: -1, createdAt: -1 })
    .limit(500)
    .lean();

  const rows = leads.map((l) => ({
    _id: String(l._id),
    name: l.name,
    waPhone: l.waPhone,
    temperature: (l.temperature || "warm") as "hot" | "warm" | "cold",
    status: l.status || "new",
    summary: l.summary,
    score: l.score ?? 0,
    createdAt:
      l.createdAt instanceof Date
        ? l.createdAt.toISOString()
        : String(l.createdAt),
    signals: ((l.signals || []) as Array<{
      rule: string;
      delta: number;
      evidence: string;
      timestamp: Date | string;
    }>).map((s) => ({
      rule: s.rule,
      delta: s.delta,
      evidence: s.evidence,
      timestamp: String(s.timestamp),
    })),
  }));

  const baseParams = { status, search };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/whatsapp">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Qualified Leads</h1>
          <p className="text-sm text-muted-foreground">
            Filter, multi-select, and forward to your team via email.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FilterCard
          href={buildHref(baseParams, { temperature: "all" })}
          active={temperature === "all"}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          label="All"
          count={totalCount}
        />
        <FilterCard
          href={buildHref(baseParams, { temperature: "hot" })}
          active={temperature === "hot"}
          icon={<Flame className="h-4 w-4 text-red-500" />}
          label="Hot"
          count={hotCount}
        />
        <FilterCard
          href={buildHref(baseParams, { temperature: "warm" })}
          active={temperature === "warm"}
          icon={<Thermometer className="h-4 w-4 text-amber-500" />}
          label="Warm"
          count={warmCount}
        />
        <FilterCard
          href={buildHref(baseParams, { temperature: "cold" })}
          active={temperature === "cold"}
          icon={<Snowflake className="h-4 w-4 text-sky-500" />}
          label="Cold"
          count={coldCount}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={buildHref({ temperature, search }, { status: s })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                status === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {s}
            </Link>
          ))}
        </div>
        <LeadsSearch />
      </div>

      <LeadsTable leads={rows} />
    </div>
  );
}

function FilterCard({
  href,
  active,
  icon,
  label,
  count,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg border p-4 transition-colors",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:bg-accent/50"
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{count}</p>
    </Link>
  );
}
