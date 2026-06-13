import { Shell } from "@/components/dashboard/Shell";
import { HealthDashboard } from "@/components/health/HealthDashboard";
import type { DayNutrition } from "@/app/api/nutrition/route";

async function getNutritionData(): Promise<DayNutrition[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/nutrition?days=30`, { cache: "no-store" });
    const data = await res.json() as { days: DayNutrition[] };
    return data.days ?? [];
  } catch {
    return [];
  }
}

export default async function HealthPage() {
  const days = await getNutritionData();
  return (
    <Shell>
      <HealthDashboard initialDays={days} />
    </Shell>
  );
}
