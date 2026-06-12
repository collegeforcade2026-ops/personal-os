"use client";

import { useEffect, useState } from "react";
import { Panel } from "./Panel";

const HABITS = [
  { id: "morning-pages", label: "Morning pages",  category: "MIND" },
  { id: "hydrate",       label: "Hydrate",         category: "BODY" },
  { id: "deep-work",     label: "Deep work",       category: "WORK" },
  { id: "train",         label: "Train",            category: "BODY" },
  { id: "read-20",       label: "Read 20 pages",   category: "MIND" },
  { id: "inbox-zero",    label: "Inbox zero",      category: "WORK" },
];

export function HabitsCard() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/daily-log")
      .then((r) => r.json())
      .then((log) => {
        const habits = log.habits ?? {};
        setDone(new Set(Object.keys(habits).filter((k) => habits[k])));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function toggle(id: string) {
    const next = new Set(done);
    next.has(id) ? next.delete(id) : next.add(id);
    setDone(next);
    await fetch("/api/daily-log", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habits: { [id]: next.has(id) } }),
    });
  }

  const pct = Math.round((done.size / HABITS.length) * 100);
  const circumference = 2 * Math.PI * 22;

  return (
    <Panel label="HABITS" labelNum="03" action={
      <span className="text-[10px] font-mono text-[var(--ink-2)]">
        {done.size}/{HABITS.length} · {pct}%
      </span>
    }>
      {/* Score row */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-12 h-12 shrink-0">
          <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
            <circle cx="24" cy="24" r="22" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              cx="24" cy="24" r="22" fill="none"
              stroke="var(--accent)" strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-[var(--ink-0)]">
            {done.size}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-mono text-[var(--ink-2)] tracking-widest uppercase">
            DAILY SCORE · RESETS 00:00
          </p>
          <p className="text-xs text-[var(--ink-3)] mt-0.5 italic">
            {done.size === 0 ? "Start with one." : done.size === HABITS.length ? "Full streak." : `${HABITS.length - done.size} remaining.`}
          </p>
        </div>
      </div>

      {/* Habit grid */}
      <div className="grid grid-cols-3 gap-2">
        {HABITS.map((h) => {
          const checked = done.has(h.id);
          return (
            <button
              key={h.id}
              onClick={() => toggle(h.id)}
              disabled={!loaded}
              className={`flex items-start gap-2 rounded border px-2.5 py-2 text-left transition-all ${
                checked
                  ? "border-[var(--accent)]/30 bg-[var(--accent)]/5"
                  : "border-[var(--border)] hover:border-[var(--ink-3)]"
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                checked ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--ink-3)]"
              }`}>
                {checked && <span className="text-[var(--ink-4)] text-[9px] font-bold">✓</span>}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-[var(--ink-1)] leading-snug truncate">{h.label}</p>
                <p className="text-[9px] font-mono text-[var(--ink-3)] uppercase tracking-wider mt-0.5">{h.category}</p>
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
