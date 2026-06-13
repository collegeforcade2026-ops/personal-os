"use client";

import { useState } from "react";
import type { Task } from "@/lib/types/task";
import { URGENCY_LABELS } from "@/lib/types/task";

interface Props {
  onTaskClick: (task: Task) => void;
}

const SUGGESTIONS = [
  "What should I do this morning?",
  "What's most urgent right now?",
  "Show me key tasks this week",
  "What's been sitting too long?",
];

export function SmartView({ onTaskClick }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/tasks/smart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json() as { tasks: Task[] };
      setResults(data.tasks);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col">
      {/* Search input */}
      <div className="relative mb-4 shrink-0">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search(query)}
          placeholder="Ask anything about your tasks…"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 pr-24 text-sm text-[var(--ink-0)] placeholder-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        <button
          onClick={() => search(query)}
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded bg-[var(--accent-dim)] border border-[var(--accent)] text-[10px] font-mono tracking-wider text-[var(--ink-0)] hover:bg-[var(--accent)] transition-colors disabled:opacity-40"
        >
          {loading ? "..." : "SEARCH"}
        </button>
      </div>

      {/* Suggestions (before search) */}
      {!searched && (
        <div className="shrink-0 mb-6">
          <p className="text-[10px] font-mono tracking-widest text-[var(--ink-3)] mb-3">SUGGESTIONS</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); search(s); }}
                className="px-3 py-1.5 rounded border border-[var(--border)] text-[11px] text-[var(--ink-2)] hover:text-[var(--ink-0)] hover:border-[var(--accent)] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[11px] font-mono text-[var(--ink-3)] animate-pulse tracking-widest">
            ASKING CLAUDE...
          </div>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[var(--ink-3)]">No matching tasks found.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2">
          <p className="text-[10px] font-mono tracking-widest text-[var(--ink-3)] mb-3">
            {results.length} RESULT{results.length !== 1 ? "S" : ""}
          </p>
          {results.map(task => (
            <button
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--ink-2)]">
                  {URGENCY_LABELS[task.urgency]}
                </span>
                {task.key && (
                  <span className="text-[10px] font-mono tracking-wider text-[var(--accent)]">★ KEY</span>
                )}
              </div>
              <p className="text-sm text-[var(--ink-0)] group-hover:text-white transition-colors">{task.title}</p>
              {task.description && (
                <p className="text-[11px] text-[var(--ink-3)] mt-1 line-clamp-2">{task.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
