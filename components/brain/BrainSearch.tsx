"use client";

import { useState, useRef } from "react";
import Anthropic from "@anthropic-ai/sdk";
import type { MemoryChunk } from "@/app/api/memory/search/route";

const SOURCE_LABELS: Record<string, string> = {
  capture:   "CAPTURE",
  task:      "TASK",
  daily_log: "JOURNAL",
  journal:   "JOURNAL",
};

const SOURCE_COLORS: Record<string, string> = {
  capture:   "text-[var(--accent)]",
  task:      "text-[var(--warn)]",
  daily_log: "text-[var(--ink-2)]",
  journal:   "text-[var(--ink-2)]",
};

const SUGGESTIONS = [
  "What have I been thinking about lately?",
  "What tasks did I capture this week?",
  "What ideas came up in my voice notes?",
  "What did I decide recently?",
  "Show me anything about money or finance",
];

export function BrainSearch() {
  const [query, setQuery] = useState("");
  const [chunks, setChunks] = useState<MemoryChunk[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [searched, setSearched] = useState(false);
  const [fallback, setFallback] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function search(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setAnswer("");
    setChunks([]);

    try {
      const res = await fetch("/api/memory/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 20 }),
      });
      const data = await res.json() as { chunks: MemoryChunk[]; fallback?: boolean };
      setChunks(data.chunks ?? []);
      setFallback(data.fallback ?? false);

      // Ask Claude to synthesize an answer from the chunks
      if (data.chunks.length > 0) {
        await askClaude(q, data.chunks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function askClaude(q: string, results: MemoryChunk[]) {
    setAnswering(true);
    const context = results
      .slice(0, 15)
      .map((c, i) => `[${i + 1}] (${c.source_type}, ${new Date(c.created_at).toLocaleDateString()}) ${c.text}`)
      .join("\n\n");

    try {
      const res = await fetch("/api/memory/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, context }),
      });
      const data = await res.json() as { answer: string };
      setAnswer(data.answer ?? "");
    } catch {
      setAnswer("");
    } finally {
      setAnswering(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 pt-2 shrink-0">
        <p className="font-mono text-[10px] tracking-widest text-[var(--ink-3)] mb-1">BRAIN · MEMORY SEARCH</p>
        <h1 className="font-mono text-lg text-[var(--ink-0)] tracking-wide">Ask your OS anything.</h1>
      </div>

      {/* Search bar */}
      <div className="relative mb-4 shrink-0">
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search(query)}
          placeholder="What was that idea I had about…"
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

      {/* Suggestions */}
      {!searched && (
        <div className="shrink-0 mb-6">
          <p className="text-[10px] font-mono tracking-widest text-[var(--ink-3)] mb-3">TRY ASKING</p>
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
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
        {/* Claude's synthesized answer */}
        {(answer || answering) && (
          <div className="bg-[var(--surface)] border border-[var(--accent)]/30 rounded-lg p-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span className="text-[10px] font-mono tracking-widest text-[var(--accent)]">CLAUDE SYNTHESIS</span>
            </div>
            {answering ? (
              <p className="text-sm text-[var(--ink-3)] animate-pulse font-mono tracking-widest">THINKING...</p>
            ) : (
              <p className="text-sm text-[var(--ink-1)] leading-relaxed whitespace-pre-wrap">{answer}</p>
            )}
          </div>
        )}

        {/* Fallback notice */}
        {fallback && (
          <p className="text-[10px] font-mono text-[var(--warn)] shrink-0">
            ⚠ Vector search not configured — showing text matches. Run the SQL migration to enable semantic search.
          </p>
        )}

        {/* Raw chunks */}
        {searched && !loading && chunks.length > 0 && (
          <div>
            <p className="text-[10px] font-mono tracking-widest text-[var(--ink-3)] mb-3">
              {chunks.length} MEMORY {chunks.length === 1 ? "CHUNK" : "CHUNKS"}
            </p>
            <div className="space-y-2">
              {chunks.map((chunk, i) => (
                <div
                  key={chunk.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--ink-3)] transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[9px] font-mono text-[var(--ink-3)]">[{i + 1}]</span>
                    <span className={`text-[9px] font-mono tracking-widest ${SOURCE_COLORS[chunk.source_type] ?? "text-[var(--ink-2)]"}`}>
                      {SOURCE_LABELS[chunk.source_type] ?? chunk.source_type.toUpperCase()}
                    </span>
                    <span className="text-[9px] font-mono text-[var(--ink-3)] ml-auto">
                      {formatDate(chunk.created_at)}
                    </span>
                    {chunk.similarity < 1 && (
                      <span className="text-[9px] font-mono text-[var(--ink-3)]">
                        {Math.round(chunk.similarity * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--ink-1)] leading-relaxed line-clamp-4">{chunk.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {searched && !loading && chunks.length === 0 && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-[var(--ink-3)]">No memories found. Send something to the bot first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
