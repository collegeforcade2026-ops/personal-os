"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "./Panel";
import type { MealEntry } from "@/lib/data/getDailyLog";

const GOAL_KCAL = 2800;
const GOAL_PROTEIN = 180;
const GOAL_CARBS = 300;
const GOAL_FAT = 80;
const CUTOFF_HOUR = 17; // 5:00 PM

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function cutoffCountdown() {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
  const diff = cutoff.getTime() - now.getTime();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function NutritionCard() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [countdown, setCountdown] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/daily-log")
      .then((r) => r.json())
      .then((log) => setMeals(log.nutrition?.meals ?? []))
      .catch(() => {});

    const id = setInterval(() => setCountdown(cutoffCountdown()), 30000);
    setCountdown(cutoffCountdown());
    return () => clearInterval(id);
  }, []);

  const totalKcal = meals.reduce((s, m) => s + m.kcal, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0);
  const pct = Math.min(Math.round((totalKcal / GOAL_KCAL) * 100), 100);
  const remaining = GOAL_KCAL - totalKcal;

  async function logMeal() {
    const text = input.trim();
    if (!text) return;
    setStatus("sending");
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
        body: JSON.stringify({ nutrition: { meals: next, goal_kcal: GOAL_KCAL } }),
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
    <Panel label="NUTRITION" labelNum="08" action={
      <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--ink-2)]">
        <span className="text-[var(--accent)] cursor-pointer">TODAY</span>
        <span className="text-[var(--ink-3)]">HISTO</span>
      </div>
    }>
      {/* Calorie total */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-mono tabular text-[var(--ink-0)]">{totalKcal.toLocaleString()}</span>
          <span className="text-xs text-[var(--ink-3)]">of {GOAL_KCAL.toLocaleString()} kcal</span>
        </div>
        <p className={`text-[10px] font-mono mt-0.5 ${remaining > 0 ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}>
          {remaining > 0 ? `−${remaining.toLocaleString()} deficit` : `+${Math.abs(remaining).toLocaleString()} over`}
        </p>
        <div className="h-0.5 rounded-full bg-[var(--border)] overflow-hidden mt-2">
          <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "PROTEIN", val: totalProtein, goal: GOAL_PROTEIN, unit: "g" },
          { label: "CARBS",   val: 0,            goal: GOAL_CARBS,   unit: "g" },
          { label: "FAT",     val: 0,            goal: GOAL_FAT,     unit: "g" },
        ].map((m) => (
          <div key={m.label}>
            <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">{m.label}</p>
            <p className="text-xs font-mono tabular text-[var(--ink-1)]">{m.val}/{m.goal}{m.unit}</p>
          </div>
        ))}
      </div>

      {/* Log input */}
      <div className="flex items-center gap-2 border border-[var(--border)] rounded px-3 py-2 mb-2 focus-within:border-[var(--ink-3)] transition-colors">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && logMeal()}
          placeholder='Log a meal — try "estimate 500 cals"'
          className="flex-1 bg-transparent text-xs text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:outline-none"
          disabled={status === "sending"}
        />
        <button
          onClick={logMeal}
          disabled={!input.trim() || status === "sending"}
          className={`text-[10px] font-mono shrink-0 transition-colors disabled:opacity-30 ${
            status === "ok" ? "text-[var(--ok)]" : "text-[var(--accent)] hover:text-[var(--ink-0)]"
          }`}
        >
          {status === "sending" ? "…" : status === "ok" ? "✓" : "+"}
        </button>
      </div>

      {/* Cutoff */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--ink-3)] mb-3">
        <span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)] inline-block mr-1.5" />
          CUTOFF · 5:00 PM
        </span>
        {countdown && <span className="text-[var(--warn)]">CUTOFF IN {countdown}</span>}
      </div>

      {/* Meal list */}
      <div>
        <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-2">TODAY · HOVER TO EDIT</p>
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {meals.length === 0 ? (
            <p className="text-[10px] text-[var(--ink-3)] italic">No meals logged yet.</p>
          ) : (
            [...meals].reverse().map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-xs group">
                <span className="font-mono text-[var(--ink-3)] w-10 tabular shrink-0">{m.time}</span>
                <span className="flex-1 text-[var(--ink-1)] truncate">{m.name}</span>
                <span className="font-mono tabular text-[var(--ink-3)] shrink-0">
                  {m.kcal}k {m.protein > 0 ? `${m.protein}p` : ""}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
