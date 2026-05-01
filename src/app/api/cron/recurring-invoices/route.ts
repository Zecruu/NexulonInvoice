import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import {
  findDueSubscriptions,
  runSubscriptionOnce,
} from "@/lib/recurring/run-subscription";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const now = new Date();
  const due = await findDueSubscriptions(now);

  const results: Array<{
    subscriptionId: string;
    invoiceId?: string;
    invoiceNumber?: string;
    emailed?: boolean;
    error?: string;
  }> = [];

  for (const sub of due) {
    try {
      const r = await runSubscriptionOnce(sub);
      results.push({
        subscriptionId: sub._id.toString(),
        invoiceId: r.invoiceId,
        invoiceNumber: r.invoiceNumber,
        emailed: r.emailed,
      });
    } catch (err) {
      results.push({
        subscriptionId: sub._id.toString(),
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    processed: results.length,
    results,
  });
}
