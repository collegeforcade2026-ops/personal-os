"use client";

import { useEffect, useState, useRef } from "react";
import { Panel } from "./Panel";
import type { GoalItem } from "@/lib/data/getDailyLog";

interface GoalSectionProps {
  scope: "week" | "month";
  label: string;
  items: GoalItem[];
  onAdd: (scope: "week" | "month", text: string) => Promise<void>;
  onToggle: (scope: "week" | "month", id: string, done: boolean) => Promise<void>;
  onDelete: (scope: "week" | "month", id: string) => Promise<void>;
}

function GoalSection({ scope, label, items, onAdd, onToggle, onDelete }: GoalSectionProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      await onAdd(scope, input.trim());
      setInput("");
    }
  }

  const done = items.filter(g => g.done).length;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono tracking-widest text-[var(--ink-2)]">{label}</span>
        <span className="text-[10px] font-mono text-[var(--ink-3)]">{done}/{items.length}</span>
      </div>
      <div className="space-y-1.5 mb-2">
        {items.map(goal => (
          <div key={goal.id} className="flex items-center gap-2 group">
            <button
              onClick={() => onToggle(scope, goal.id, !goal.done)}
              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                goal.done
                  ? "bg-[var(--accent)] border-[var(--accent)]"
                  : "border-[var(--ink-3)] hover:border-[var(--accent)]"
              }`}
            >
              {goal.done && <span className="text-[var(--ink-4)] text-[9px] font-bold">✓</span>}
            </button>
            <span className={`flex-1 text-xs leading-snug transition-colors ${
              goal.done ? "text-[var(--ink-3)] line-through" : "text-[var(--ink-1)]"
            }`}>
              {goal.text}
            </span>
            <button
              onClick={() => onDelete(scope, goal.id)}
              className="opacity-0 group-hover:opacity-100 text-[var(--ink-3)] hover:text-[var(--danger)] text-xs leading-none transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-[11px] text-[var(--ink-3)] italic">No goals yet.</p>
        )}
      </div>
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="+ Add goal…"
        className="w-full bg-transparent border border-dashed border-[var(--border)] rounded px-2.5 py-1.5 text-[11px] text-[var(--ink-2)] placeholder-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)] focus:text-[var(--ink-0)] transition-colors"
      />
    </div>
  );
}

export function GoalsCard() {
  const [weekGoals, setWeekGoals] = useState<GoalItem[]>([]);
  const [monthGoals, setMonthGoals] = useState<GoalItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/goals")
      .then(r => r.json())
      .then(data => {
        setWeekGoals(data.week ?? []);
        setMonthGoals(data.month ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleAdd(scope: "week" | "month", text: string) {
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, text }),
    });
    const data = await res.json() as { item: GoalItem };
    if (scope === "week") setWeekGoals(prev => [...prev, data.item]);
    else setMonthGoals(prev => [...prev, data.item]);
  }

  async function handleToggle(scope: "week" | "month", id: string, done: boolean) {
    if (scope === "week") {
      setWeekGoals(prev => prev.map(g => g.id === id ? { ...g, done } : g));
    } else {
      setMonthGoals(prev => prev.map(g => g.id === id ? { ...g, done } : g));
    }
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, id, done }),
    });
  }

  async function handleDelete(scope: "week" | "month", id: string) {
    if (scope === "week") setWeekGoals(prev => prev.filter(g => g.id !== id));
    else setMonthGoals(prev => prev.filter(g => g.id !== id));
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, id }),
    });
  }

  if (!loaded) {
    return (
      <Panel label="GOALS" labelNum="07">
        <div className="text-[11px] font-mono text-[var(--ink-3)] animate-pulse">LOADING...</div>
      </Panel>
    );
  }

  return (
    <Panel label="GOALS" labelNum="07">
      <GoalSection
        scope="week"
        label="THIS WEEK"
        items={weekGoals}
        onAdd={handleAdd}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
      <GoalSection
        scope="month"
        label="THIS MONTH"
        items={monthGoals}
        onAdd={handleAdd}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
    </Panel>
  );
}
