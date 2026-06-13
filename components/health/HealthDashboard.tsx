"use client";

import { useState } from "react";
import type { DayNutrition } from "@/app/api/nutrition/route";

interface Props {
  initialDays: DayNutrition[];
}

function avg(days: DayNutrition[], key: keyof Omit<DayNutrition, "date" | "meals">) {
  if (days.length === 0) return 0;
  return Math.round(days.reduce((s, d) => s + (d[key] as number), 0) / days.length);
}

function fmt(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

export function HealthDashboard({ initialDays }: Props) {
  const [days] = useState<DayNutrition[]>(initialDays);
  const [expanded, setExpanded] = useState<string | null>(null);

  const logged = days.filter(d => d.meals.length > 0);

  const averages = {
    kcal:    avg(logged, "kcal"),
    protein: avg(logged, "protein"),
    carbs:   avg(logged, "carbs"),
    fat:     avg(logged, "fat"),
  };

  function toggle(date: string) {
    setExpanded(prev => (prev === date ? null : date));
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 shrink-0">
        <p className="font-mono text-[10px] tracking-widest text-[var(--ink-3)] mb-1">
          HEALTH · 30-DAY LOG
        </p>
        <h1 className="font-mono text-lg text-[var(--ink-0)] tracking-wide">Nutrition History</h1>
      </div>

      {/* Averages banner */}
      <div className="grid grid-cols-4 gap-3 mb-6 shrink-0">
        {[
          { label: "AVG KCAL",    value: averages.kcal,    unit: "kcal", color: "text-[var(--warn)]" },
          { label: "AVG PROTEIN", value: averages.protein, unit: "g",    color: "text-[var(--accent)]" },
          { label: "AVG CARBS",   value: averages.carbs,   unit: "g",    color: "text-[var(--ink-1)]" },
          { label: "AVG FAT",     value: averages.fat,     unit: "g",    color: "text-[var(--ink-1)]" },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4"
          >
            <p className="text-[9px] font-mono tracking-widest text-[var(--ink-3)] mb-1">{stat.label}</p>
            <p className={`font-mono text-2xl tabular-nums ${stat.color}`}>
              {stat.value > 0 ? stat.value : "—"}
            </p>
            <p className="text-[10px] font-mono text-[var(--ink-3)]">{stat.unit}</p>
          </div>
        ))}
      </div>

      {/* Subheader */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <p className="text-[10px] font-mono tracking-widest text-[var(--ink-3)]">
          {logged.length} LOGGED DAY{logged.length !== 1 ? "S" : ""} (LAST 30)
        </p>
        <div className="grid grid-cols-5 gap-8 text-[9px] font-mono tracking-widest text-[var(--ink-3)] pr-2">
          <span>DATE</span>
          <span className="text-right">KCAL</span>
          <span className="text-right">PROTEIN</span>
          <span className="text-right">CARBS</span>
          <span className="text-right">FAT</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
        {logged.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-[var(--ink-3)]">No nutrition data yet. Log meals in the Home tab.</p>
          </div>
        ) : (
          logged.map(day => (
            <div key={day.date} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
              {/* Day row */}
              <button
                onClick={() => toggle(day.date)}
                className="w-full grid grid-cols-5 gap-8 px-4 py-3 hover:bg-[var(--border)]/30 transition-colors text-left"
              >
                <span className="text-[11px] font-mono text-[var(--ink-1)]">{fmt(day.date)}</span>
                <span className="text-[11px] font-mono tabular-nums text-[var(--warn)] text-right">{day.kcal}</span>
                <span className="text-[11px] font-mono tabular-nums text-[var(--accent)] text-right">{day.protein}g</span>
                <span className="text-[11px] font-mono tabular-nums text-[var(--ink-1)] text-right">{day.carbs}g</span>
                <span className="text-[11px] font-mono tabular-nums text-[var(--ink-1)] text-right">{day.fat}g</span>
              </button>

              {/* Expanded meals */}
              {expanded === day.date && (
                <div className="border-t border-[var(--border)] bg-[var(--background)]">
                  <div className="px-4 py-1">
                    <p className="text-[9px] font-mono tracking-widest text-[var(--ink-3)] mb-2">
                      {day.meals.length} MEAL{day.meals.length !== 1 ? "S" : ""}
                    </p>
                    <div className="space-y-1.5">
                      {day.meals.map((meal, i) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {meal.time && (
                              <span className="text-[10px] font-mono text-[var(--ink-3)] shrink-0 w-10">
                                {meal.time}
                              </span>
                            )}
                            <span className="text-[11px] text-[var(--ink-1)] truncate">{meal.name}</span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0 text-[10px] font-mono tabular-nums">
                            <span className="text-[var(--warn)] w-14 text-right">{meal.kcal} kcal</span>
                            <span className="text-[var(--accent)] w-12 text-right">{meal.protein}g P</span>
                            {meal.carbs != null && (
                              <span className="text-[var(--ink-2)] w-12 text-right">{meal.carbs}g C</span>
                            )}
                            {meal.fat != null && (
                              <span className="text-[var(--ink-2)] w-10 text-right">{meal.fat}g F</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
