import { NextRequest, NextResponse } from "next/server";
import { getDailyLog, upsertDailyLog } from "@/lib/data/getDailyLog";
import type { GoalItem } from "@/lib/data/getDailyLog";
import { randomUUID } from "crypto";

// Goals never auto-clear — stored on a sentinel date
const SENTINEL = "2000-01-01";
const USER_ID = "cade";

export async function GET() {
  try {
    const log = await getDailyLog(USER_ID, SENTINEL);
    return NextResponse.json({
      week: log.goalsWeek ?? [],
      month: log.goalsMonth ?? [],
    });
  } catch (err) {
    console.error("[GET /api/goals]", err);
    return NextResponse.json({ week: [], month: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { scope, text } = await req.json() as { scope: "week" | "month"; text: string };
    const log = await getDailyLog(USER_ID, SENTINEL);
    const newItem: GoalItem = { id: randomUUID(), text, done: false };

    if (scope === "week") {
      await upsertDailyLog(USER_ID, SENTINEL, {
        goalsWeek: [...(log.goalsWeek ?? []), newItem],
      });
    } else {
      await upsertDailyLog(USER_ID, SENTINEL, {
        goalsMonth: [...(log.goalsMonth ?? []), newItem],
      });
    }
    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/goals]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { scope, id, done, text } = await req.json() as {
      scope: "week" | "month";
      id: string;
      done?: boolean;
      text?: string;
    };
    const log = await getDailyLog(USER_ID, SENTINEL);
    const list = scope === "week" ? (log.goalsWeek ?? []) : (log.goalsMonth ?? []);
    const updated = list.map((g: GoalItem) =>
      g.id === id ? { ...g, ...(done !== undefined ? { done } : {}), ...(text !== undefined ? { text } : {}) } : g
    );
    await upsertDailyLog(USER_ID, SENTINEL, {
      [scope === "week" ? "goalsWeek" : "goalsMonth"]: updated,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/goals]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { scope, id } = await req.json() as { scope: "week" | "month"; id: string };
    const log = await getDailyLog(USER_ID, SENTINEL);
    const list = scope === "week" ? (log.goalsWeek ?? []) : (log.goalsMonth ?? []);
    const filtered = list.filter((g: GoalItem) => g.id !== id);
    await upsertDailyLog(USER_ID, SENTINEL, {
      [scope === "week" ? "goalsWeek" : "goalsMonth"]: filtered,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/goals]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
