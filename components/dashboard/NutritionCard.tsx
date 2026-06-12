"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "./Panel";
import type { MealEntry } from "@/lib/data/getDailyLog";

const GOAL_KCAL = 2800;
const GOAL_PROTEIN = 180;

function nowTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function NutritionCard() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/daily-log")
      .then((r) => r.json())
      .then((log) => {
        setMeals(log.nutrition?.meals ?? []);
      })
      .catch(() => {});
  }, []);

  const totalKcal = meals.reduce((s, m) => s + m.kcal, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0);
  const pct = Math.min(Math.round((totalKcal / GOAL_KCAL) * 100), 100);
  const remaining = GOAL_KCAL - totalKcal;

  async function logMeal() {
    const text = input.trim();
    if (!text) return;
    setStatus("sending");

    // Parse "name kcal protein" or just "name kcal"
    // Formats: "chicken rice 600 50p" | "protein shake 180" | "estimate 500 cals"
    const nums = text.match(/\d+/g)?.map(Number) ?? [];
    const kcal = nums[0] ?? 0;
    const protein = nums[1] ?? 0;
    const name = text.replace(/\d+[gkcp]*/gi, "").replace(/estimate|cals?/gi, "").trim() || text;

    const meal: MealEntry = { time: nowTime(), name, kcal, protein };
    const next = [...meals, meal];

    try {
      await fetch("/api/daily-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nutrition: { meals: next, goal_kcal: GOAL_KCAL },
        }),
      });
      setMeals(next);
      setInput("");
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  return (
    <Panel
      label="NUTRITION"
      labelNum="05"
      action={<span className="text-[10px] font-mono text-[var(--ink-2)]">‹ TODAY ›</span>}
    >
      {/* Totals */}
      <div className="mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-mono tabular text-[var(--ink-0)]">
            {totalKcal.toLocaleString()}
          </span>
          <span className="text-xs text-[var(--ink-2)]">of {GOAL_KCAL.toLocaleString()} kcal</span>
        </div>
        <p className={`text-[10px] font-mono mb-2 ${remaining > 0 ? "text-[var(--warn)]" : "text-[var(--ok)]"}`}>
          {remaining > 0
            ? `-${remaining.toLocaleString()} remaining`
            : `+${Math.abs(remaining).toLocaleString()} over goal`}
        </p>
        <div className="h-1 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">PROTEIN</p>
          <p className="text-xs font-mono tabular text-[var(--ink-1)]">{totalProtein}/{GOAL_PROTEIN}g</p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">MEALS</p>
          <p className="text-xs font-mono tabular text-[var(--ink-1)]">{meals.length} logged</p>
        </div>
      </div>

      {/* Log input */}
      <div className="bg-[var(--ink-3)]/10 rounded-lg px-3 py-2 mb-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && logMeal()}
          placeholder='e.g. "chicken rice 600 50" (kcal protein)'
          className="flex-1 bg-transparent text-xs text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:outline-none"
          disabled={status === "sending"}
        />
        <button
          onClick={logMeal}
          disabled={!input.trim() || status === "sending"}
          className={`text-[10px] font-mono shrink-0 transition-colors disabled:opacity-40 ${
            status === "ok" ? "text-[var(--ok)]" : "text-[var(--accent)] hover:text-[var(--ink-0)]"
          }`}
        >
          {status === "sending" ? "…" : status === "ok" ? "✓" : "+ LOG"}
        </button>
      </div>

      {/* Meal list */}
      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
        {meals.length === 0 ? (
          <p className="text-[10px] text-[var(--ink-3)] italic">No meals logged yet.</p>
        ) : (
          [...meals].reverse().map((m, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="font-mono text-[var(--ink-3)] w-10 tabular shrink-0">{m.time}</span>
              <span className="flex-1 text-[var(--ink-1)] mx-2 truncate">{m.name}</span>
              <span className="font-mono tabular text-[var(--ink-2)] shrink-0">
                {m.kcal}k{m.protein > 0 ? ` · ${m.protein}p` : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
