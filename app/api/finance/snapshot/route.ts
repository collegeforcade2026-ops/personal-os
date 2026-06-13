import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const USER_ID = process.env.USER_ID ?? "cade";
const SENTINEL_DATE = "2000-01-02"; // finance snapshot anchor (different from goals 2000-01-01)

// GET /api/finance/snapshot
// Called by Vercel cron daily at 5am UTC (vercel.json) and by manual ?refresh=1.
// Vercel sends:  Authorization: Bearer $CRON_SECRET
// Manual:        ?secret=CRON_SECRET   (dev convenience)
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  // Verify caller — Vercel cron sends Authorization: Bearer <secret>
  const authHeader = req.headers.get("authorization") ?? "";
  const querySecret = req.nextUrl.searchParams.get("secret") ?? "";
  const isVercelCron = authHeader === `Bearer ${cronSecret}`;
  const isManual     = querySecret === cronSecret;

  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch current balances from Sheets via existing internal API
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const balancesRes = await fetch(`${base}/api/finance/balances`, {
      headers: { "x-api-secret": process.env.API_SECRET ?? "" },
      cache: "no-store",
    });

    if (!balancesRes.ok) {
      throw new Error(`Balances fetch failed: ${balancesRes.status}`);
    }

    const { balances } = await balancesRes.json() as { balances: unknown[] };

    // Compute net worth from balances
    const netWorth = (balances as Array<{ value?: number; type?: string }>).reduce((sum, b) => {
      const v = b.value ?? 0;
      return sum + (b.type === "liability" ? -v : v);
    }, 0);

    // Save snapshot to daily_logs on sentinel date
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("daily_logs")
      .select("notes")
      .eq("user_id", USER_ID)
      .eq("log_date", SENTINEL_DATE)
      .maybeSingle();

    const currentNotes = (existing?.notes as Record<string, unknown>) ?? {};
    const history = (currentNotes.financeHistory as Array<{ date: string; netWorth: number }>) ?? [];

    // Upsert today's snapshot in the history array
    const updatedHistory = [
      ...history.filter(h => h.date !== today),
      { date: today, netWorth: Math.round(netWorth) },
    ].sort((a, b) => a.date.localeCompare(b.date));

    const updatedNotes = {
      ...currentNotes,
      financeSnapshot: { netWorth: Math.round(netWorth), asOf: today, balances },
      financeHistory: updatedHistory,
    };

    await supabase
      .from("daily_logs")
      .upsert(
        { user_id: USER_ID, log_date: SENTINEL_DATE, notes: updatedNotes },
        { onConflict: "user_id,log_date" }
      );

    return NextResponse.json({
      ok: true,
      snapshotDate: today,
      netWorth: Math.round(netWorth),
    });
  } catch (err) {
    console.error("[finance/snapshot]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
