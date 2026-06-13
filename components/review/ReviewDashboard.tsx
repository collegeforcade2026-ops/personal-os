"use client";

import { useState } from "react";
import type { DailyLogNotes } from "@/lib/data/getDailyLog";
import type { Task } from "@/lib/types/task";
import { URGENCY_LABELS } from "@/lib/types/task";

const HABITS = [
  { id: "morning-pages", label: "Morning pages",  category: "MIND" },
  { id: "hydrate",       label: "Hydrate",         category: "BODY" },
  { id: "deep-work",     label: "Deep work",       category: "WORK" },
  { id: "train",         label: "Train",            category: "BODY" },
  { id: "read-20",       label: "Read 20 pages",   category: "MIND" },
  { id: "inbox-zero",    label: "Inbox zero",       category: "WORK" },
];

interface Props {
  date: string;
  initialLog: DailyLogNotes;
  openTasks: Task[];
}

export function ReviewDashboard({ date, initialLog, openTasks }: Props) {
  const [notes, setNotes] = useState(initialLog.reviewNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const habits = initialLog.habits ?? {};
  const donePct = HABITS.length > 0
    ? Math.round((HABITS.filter(h => habits[h.id]).length / HABITS.length) * 100)
    : 0;

  const todayTasks = openTasks.filter(t => t.urgency === "today");
  const weekTasks = openTasks.filter(t => t.urgency === "this-week");

  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).toUpperCase();

  async function saveNotes() {
    setSaving(true);
    await fetch("/api/daily-log", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNotes: notes }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-8 pt-2">
        <p className="font-mono text-[10px] tracking-widest text-[var(--ink-3)] mb-1">DAILY REVIEW</p>
        <h1 className="font-mono text-lg text-[var(--ink-0)] tracking-wide">{displayDate}</h1>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6">
        {/* Left: Notes */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-[var(--ink-2)]">EOD NOTES</span>
            <button
              onClick={saveNotes}
              disabled={saving}
              className="px-3 py-1 rounded bg-[var(--accent-dim)] border border-[var(--accent)] text-[10px] font-mono tracking-wider text-[var(--ink-0)] hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
            >
              {saving ? "SAVING..." : saved ? "SAVED ✓" : "SAVE"}
            </button>
          </div>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setSaved(false); }}
            placeholder={`What did you accomplish today?\nWhat's carrying over?\nAnything blocking you?\nOne thing you're grateful for.`}
            rows={16}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--ink-0)] placeholder-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none leading-relaxed"
          />

          {/* Quick prompts */}
          <div className="mt-4">
            <p className="font-mono text-[10px] tracking-widest text-[var(--ink-3)] mb-2">QUICK PROMPTS</p>
            <div className="flex flex-wrap gap-2">
              {[
                "What went well?",
                "What carried over?",
                "What will I do differently?",
                "Top 3 wins today",
                "Main blocker right now",
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setNotes(prev => prev ? `${prev}\n\n${prompt}\n` : `${prompt}\n`)}
                  className="px-2.5 py-1 rounded border border-[var(--border)] text-[10px] font-mono text-[var(--ink-2)] hover:text-[var(--ink-0)] hover:border-[var(--accent)] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Habit summary + Task rollover */}
        <div className="space-y-6">
          {/* Habit score */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] tracking-widest text-[var(--ink-2)]">HABIT SCORE</span>
              <span className={`font-mono text-2xl tabular ${
                donePct === 100 ? "text-[var(--accent)]" :
                donePct >= 66 ? "text-[var(--warn)]" : "text-[var(--ink-1)]"
              }`}>{donePct}%</span>
            </div>
            <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all"
                style={{ width: `${donePct}%` }}
              />
            </div>
            <div className="space-y-2">
              {HABITS.map(h => {
                const done = !!habits[h.id];
                return (
                  <div key={h.id} className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 text-[9px] ${
                      done ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--ink-4)]" : "border-[var(--ink-3)]"
                    }`}>
                      {done && "✓"}
                    </span>
                    <span className={`text-xs ${done ? "text-[var(--ink-2)] line-through" : "text-[var(--ink-1)]"}`}>
                      {h.label}
                    </span>
                    <span className="ml-auto text-[9px] font-mono text-[var(--ink-3)]">{h.category}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task rollover */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] tracking-widest text-[var(--ink-2)]">OPEN TASKS</span>
              <span className="font-mono text-[10px] text-[var(--ink-3)]">{openTasks.length} TOTAL</span>
            </div>

            {todayTasks.length > 0 && (
              <div className="mb-3">
                <p className="text-[9px] font-mono tracking-widest text-[var(--danger)] mb-2">TODAY</p>
                <div className="space-y-1.5">
                  {todayTasks.slice(0, 4).map(t => (
                    <div key={t.id} className="flex items-center gap-2">
                      {t.key && <span className="w-1 h-1 rounded-full bg-[var(--accent)] shrink-0" />}
                      <span className="text-xs text-[var(--ink-1)] truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {weekTasks.length > 0 && (
              <div>
                <p className="text-[9px] font-mono tracking-widest text-[var(--warn)] mb-2">THIS WEEK</p>
                <div className="space-y-1.5">
                  {weekTasks.slice(0, 3).map(t => (
                    <div key={t.id} className="flex items-center gap-2">
                      {t.key && <span className="w-1 h-1 rounded-full bg-[var(--accent)] shrink-0" />}
                      <span className="text-xs text-[var(--ink-1)] truncate">{t.title}</span>
                    </div>
                  ))}
                  {weekTasks.length > 3 && (
                    <p className="text-[10px] text-[var(--ink-3)] font-mono">+{weekTasks.length - 3} more</p>
                  )}
                </div>
              </div>
            )}

            {openTasks.length === 0 && (
              <p className="text-xs text-[var(--ink-3)] italic">Clean slate.</p>
            )}
          </div>

          {/* Tomorrow prompt */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
            <p className="font-mono text-[10px] tracking-widest text-[var(--ink-2)] mb-2">TOMORROW</p>
            <p className="text-xs text-[var(--ink-3)] leading-relaxed">
              What&apos;s the single most important thing you need to do tomorrow?
            </p>
            <input
              placeholder="One thing…"
              onKeyDown={async e => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (!val) return;
                  await fetch("/api/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: val, urgency: "today", key: true }),
                  });
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              className="mt-3 w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--ink-0)] placeholder-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
