"use client";

import { useEffect, useState } from "react";
import { Panel } from "./Panel";

const HABITS = [
  { id: "morning-pages", label: "Morning pages", category: "MIND" },
  { id: "hydrate",       label: "Hydrate",        category: "BODY" },
  { id: "deep-work",     label: "Deep work",      category: "WORK" },
  { id: "train",         label: "Train",           category: "BODY" },
  { id: "read-20",       label: "Read 20 pages",  category: "MIND" },
  { id: "inbox-zero",    label: "Inbox zero",     category: "WORK" },
];

export function HabitsCard() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load today's habits on mount
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

    // Persist
    await fetch("/api/daily-log", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habits: { [id]: next.has(id) } }),
    });
  }

  const pct = HABITS.length > 0 ? Math.round((done.size / HABITS.length) * 100) : 0;

  return (
    <Panel
      label="HABITS"
      labelNum="03"
      action={
        <span className="text-[10px] font-mono text-[var(--ink-2)]">
          {done.size} / {HABITS.length} · {pct}%
        </span>
      }
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
            <circle cx="28" cy="28" r="22" fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle
              cx="28" cy="28" r="22" fill="none"
              stroke="var(--accent)" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 22}`}
              strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-[var(--ink-0)]">
            {pct}%
          </span>
        </div>
        <div>
          <p className="text-lg font-mono text-[var(--ink-0)]">{pct}%</p>
          <p className="text-[10px] font-mono text-[var(--ink-2)] tracking-widest uppercase">
            Daily Score · Resets 00:00
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {HABITS.map((h) => (
          <button
            key={h.id}
            onClick={() => toggle(h.id)}
            disabled={!loaded}
            className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition-colors ${
              done.has(h.id)
                ? "border-[var(--accent)]/40 bg-[var(--accent)]/5"
                : "border-[var(--border)] hover:border-[var(--ink-2)]"
            }`}
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                done.has(h.id)
                  ? "bg-[var(--accent)] border-[var(--accent)]"
                  : "border-[var(--ink-2)]"
              }`}
            >
              {done.has(h.id) && (
                <span className="text-[var(--ink-4)] text-[10px]">✓</span>
              )}
            </span>
            <div>
              <p className="text-xs text-[var(--ink-1)]">{h.label}</p>
              <p className="text-[9px] font-mono text-[var(--ink-3)] uppercase">{h.category}</p>
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}
