import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const USER_ID = process.env.USER_ID ?? "cade";

export interface DayNutrition {
  date: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: { time?: string; name: string; kcal: number; protein: number; carbs?: number; fat?: number }[];
}

// GET /api/nutrition?days=30  — returns one entry per day that has nutrition data
export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10);

  // Compute start date
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  const startStr = start.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_logs")
    .select("log_date, notes")
    .eq("user_id", USER_ID)
    .gte("log_date", startStr)
    .order("log_date", { ascending: false })
    .limit(200000 + (Date.now() % 100000)); // cache-bust

  if (error) {
    console.error("[GET /api/nutrition]", error);
    return NextResponse.json({ days: [] }, { status: 500 });
  }

  const result: DayNutrition[] = [];

  for (const row of data ?? []) {
    const notes = row.notes as Record<string, unknown> | null;
    const nutrition = notes?.nutrition as { meals?: unknown[] } | null;
    const meals = Array.isArray(nutrition?.meals) ? nutrition.meals : [];

    if (meals.length === 0) continue; // skip days with no nutrition data

    const dayTotals = meals.reduce(
      (acc: { kcal: number; protein: number; carbs: number; fat: number }, m) => {
        const meal = m as { kcal?: number; protein?: number; carbs?: number; fat?: number };
        return {
          kcal:    acc.kcal    + (meal.kcal    ?? 0),
          protein: acc.protein + (meal.protein  ?? 0),
          carbs:   acc.carbs   + (meal.carbs    ?? 0),
          fat:     acc.fat     + (meal.fat      ?? 0),
        };
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );

    result.push({
      date:    row.log_date as string,
      kcal:    Math.round(dayTotals.kcal),
      protein: Math.round(dayTotals.protein),
      carbs:   Math.round(dayTotals.carbs),
      fat:     Math.round(dayTotals.fat),
      meals:   meals as DayNutrition["meals"],
    });
  }

  return NextResponse.json({ days: result });
}
