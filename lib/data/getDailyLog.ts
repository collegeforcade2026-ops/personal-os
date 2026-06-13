import { supabase } from "@/lib/supabase";
import { embedAndStore } from "@/lib/data/embedAndStore";

const USER_ID = process.env.USER_ID ?? "cade";

export interface MealEntry {
  time: string;
  name: string;
  kcal: number;
  protein: number;
}

export interface HabitLog {
  [habitId: string]: boolean;
}

export interface GoalItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DailyLogNotes {
  habits?: HabitLog;
  nutrition?: { meals: MealEntry[]; goal_kcal: number };
  goalsWeek?: GoalItem[];
  goalsMonth?: GoalItem[];
  reviewNotes?: string;
}

export async function getDailyLog(
  _userId: string,
  date: string
): Promise<DailyLogNotes> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("notes")
    .eq("user_id", USER_ID)
    .eq("log_date", date)
    .maybeSingle();

  if (error) { console.error("[getDailyLog]", error); return {}; }
  if (!data?.notes) return {};

  try {
    return typeof data.notes === "string"
      ? JSON.parse(data.notes)
      : (data.notes as DailyLogNotes);
  } catch {
    return {};
  }
}

export async function upsertDailyLog(
  _userId: string,
  date: string,
  patch: Partial<DailyLogNotes>
): Promise<void> {
  const existing = await getDailyLog(USER_ID, date);

  const merged: DailyLogNotes = {
    ...existing,
    ...patch,
    habits: { ...(existing.habits ?? {}), ...(patch.habits ?? {}) },
    nutrition: patch.nutrition ?? existing.nutrition,
    goalsWeek: patch.goalsWeek ?? existing.goalsWeek,
    goalsMonth: patch.goalsMonth ?? existing.goalsMonth,
    reviewNotes: patch.reviewNotes ?? existing.reviewNotes,
  };

  const { error } = await supabase.from("daily_logs").upsert(
    {
      user_id: USER_ID,
      log_date: date,
      notes: JSON.stringify(merged),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,log_date" }
  );

  if (error) { console.error("[upsertDailyLog]", error); return; }

  // Embed notable entries — review notes and new habits completion
  if (patch.reviewNotes) {
    const text = `Review ${date}: ${patch.reviewNotes}`;
    embedAndStore(text, "daily_log", `${USER_ID}-${date}`).catch(console.error);
  }
}
