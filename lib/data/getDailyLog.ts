import { supabase } from "@/lib/supabase";

export interface HabitLog {
  [habitId: string]: boolean;
}

export interface MealEntry {
  time: string;
  name: string;
  kcal: number;
  protein: number;
}

export interface NutritionLog {
  meals: MealEntry[];
  goal_kcal: number;
}

export interface DailyLogNotes {
  habits?: HabitLog;
  nutrition?: NutritionLog;
}

export async function getDailyLog(
  userId: string,
  date: string // YYYY-MM-DD
): Promise<DailyLogNotes> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("notes")
    .eq("user_id", userId)
    .eq("log_date", date)
    .maybeSingle();

  if (error) {
    console.error("[getDailyLog]", error);
    return {};
  }

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
  userId: string,
  date: string,
  patch: Partial<DailyLogNotes>
): Promise<void> {
  // Read existing first so we merge, not overwrite
  const existing = await getDailyLog(userId, date);
  const merged: DailyLogNotes = {
    ...existing,
    ...patch,
    habits: { ...(existing.habits ?? {}), ...(patch.habits ?? {}) },
    nutrition: patch.nutrition ?? existing.nutrition,
  };

  const { error } = await supabase.from("daily_logs").upsert(
    {
      user_id: userId,
      log_date: date,
      notes: JSON.stringify(merged),
    },
    { onConflict: "user_id,log_date" }
  );

  if (error) console.error("[upsertDailyLog]", error);
}
