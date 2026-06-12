"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "./Panel";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function SessionCard() {
  const now = useClock();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateStr = now
    .toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    .toUpperCase();

  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCapture() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error("Failed");
      setText("");
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCapture();
  }

  const btnLabel =
    status === "sending" ? "…" : status === "ok" ? "✓ Saved" : status === "error" ? "✗ Err" : "Capture ↓";

  return (
    <Panel label="SESSION" labelNum="02">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-2xl font-light text-[var(--ink-0)]">
            {greeting}, <span className="italic">Cade.</span>
          </p>
          <p className="text-[10px] font-mono text-[var(--ink-2)] tracking-widest mt-1">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono tabular text-[var(--ink-0)]">
            {hh}:{mm}
            <span className="text-lg text-[var(--ink-3)]">{ss}</span>
          </p>
          <p className="text-[10px] font-mono text-[var(--ink-2)] tracking-widest">LOCAL TIME</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[var(--ink-3)]/20 rounded-lg px-3 py-2">
        <span className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest uppercase shrink-0">⚡</span>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Capture a thought, task, or note…"
          className="flex-1 bg-transparent text-sm text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:outline-none"
          disabled={status === "sending"}
        />
        <button
          onClick={handleCapture}
          disabled={status === "sending" || !text.trim()}
          className={`text-[10px] font-mono border rounded px-2 py-1 shrink-0 transition-colors
            ${status === "ok"
              ? "border-[var(--ok)] text-[var(--ok)]"
              : status === "error"
              ? "border-[var(--danger)] text-[var(--danger)]"
              : "border-[var(--border)] text-[var(--ink-2)] hover:text-[var(--ink-1)] disabled:opacity-40"
            }`}
        >
          {btnLabel}
        </button>
      </div>
    </Panel>
  );
}
