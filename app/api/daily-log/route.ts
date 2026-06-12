import { NextRequest, NextResponse } from "next/server";
import { getDailyLog, upsertDailyLog } from "@/lib/data/getDailyLog";

const USER_ID = process.env.USER_ID ?? "cade";

function todayDate() {
  // YYYY-MM-DD in user's timezone (falls back to UTC)
  return new Date()
    .toLocaleDateString("en-CA", {
      timeZone: process.env.USER_TIMEZONE ?? "UTC",
    });
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? todayDate();
  const log = await getDailyLog(USER_ID, date);
  return NextResponse.json(log);
}

export async function PATCH(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? todayDate();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await upsertDailyLog(USER_ID, date, body);
  return NextResponse.json({ ok: true });
}
