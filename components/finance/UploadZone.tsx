"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Transaction } from "@/lib/types/finance";

type UploadStatus = "idle" | "uploading" | "done" | "error";

const CATEGORY_COLORS: Record<string, string> = {
  "Income": "text-[var(--ok)]",
  "Transfer": "text-[var(--ink-2)]",
  "CC Payment": "text-[var(--ink-2)]",
  "Savings & Investing": "text-[var(--ok)]",
  "Housing": "text-[var(--danger)]",
  "Food & Groceries": "text-[var(--warn)]",
  "Dining Out": "text-[var(--warn)]",
  "Transport & Gas": "text-[var(--warn)]",
  "Entertainment": "text-[var(--accent)]",
  "Subscriptions": "text-[var(--accent)]",
  "Health & Fitness": "text-[var(--accent)]",
  "Personal & Shopping": "text-[var(--accent)]",
  "Other": "text-[var(--ink-3)]",
};

function CategoryBadge({ category }: { category: string }) {
  const colorClass = CATEGORY_COLORS[category] ?? "text-[var(--ink-3)]";
  return (
    <span className={`text-[10px] font-mono uppercase tracking-wide ${colorClass}`}>
      {category}
    </span>
  );
}

// These categories move money between accounts — not real spend
const PASS_THROUGH = new Set(["CC Payment", "Transfer"]);

function isRealSpend(t: Transaction) {
  return t.amount < 0 && !PASS_THROUGH.has(t.category);
}

function isRealIncome(t: Transaction) {
  return t.amount > 0 && !PASS_THROUGH.has(t.category);
}

function groupByCategory(txns: Transaction[]) {
  const map: Record<string, number> = {};
  for (const t of txns) {
    if (isRealSpend(t)) {
      map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount);
    }
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export function UploadZone() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted transactions from Google Sheet on mount
  useEffect(() => {
    fetch("/api/finance/transactions")
      .then(r => r.json())
      .then((data: { transactions: Transaction[] }) => setTransactions(data.transactions ?? []))
      .catch(() => {});
  }, []);

  async function upload(file: File) {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    setStatus("uploading");
    setError(null);
    setWarning(null);
    setFilename(file.name);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/finance/upload", { method: "POST", body: fd });
      const json = await res.json() as {
        ok?: boolean;
        transactions?: Transaction[];
        warning?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Upload failed");
        setStatus("error");
      } else {
        setTransactions(prev => [...prev, ...(json.transactions ?? [])]);
        if (json.warning) setWarning(json.warning);
        setStatus("done");
      }
    } catch {
      setError("Network error — could not reach server.");
      setStatus("error");
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }, []);

  const totalIncome = transactions.filter(isRealIncome).reduce((s, t) => s + t.amount, 0);
  const totalSpend = transactions.filter(isRealSpend).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = totalIncome - totalSpend;
  const byCategory = groupByCategory(transactions);

  return (
    <>
      {/* Left: uploader + table */}
      <div className="flex flex-col gap-4">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
            dragging
              ? "border-[var(--accent)] bg-[oklch(10%_0.03_220)]"
              : "border-[var(--border)] hover:border-[var(--ink-3)]"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => status !== "uploading" && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onFileChange} />
          {status === "uploading" ? (
            <>
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-[var(--ink-2)]">Extracting transactions from {filename}…</p>
              <p className="text-[10px] text-[var(--ink-3)]">Claude is reading and categorizing your statement</p>
            </>
          ) : status === "done" ? (
            <>
              <span className="text-2xl text-[var(--ok)]">✓</span>
              <p className="text-xs font-mono text-[var(--ok)]">{transactions.length} transactions extracted</p>
              <p className="text-[10px] text-[var(--ink-3)] font-mono">{filename}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setStatus("idle"); setFilename(null); setWarning(null); }}
                className="text-[10px] font-mono text-[var(--ink-3)] hover:text-[var(--ink-1)] border border-[var(--border)] px-3 py-1 rounded mt-1"
              >
                Upload another
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-14 border border-[var(--border)] rounded-sm flex items-center justify-center">
                <span className="text-2xl text-[var(--ink-3)]">📄</span>
              </div>
              <p className="text-sm font-mono text-[var(--ink-1)]">Drop bank statement PDF here</p>
              <p className="text-[10px] text-[var(--ink-3)]">or click to browse — PDF only, stays on your server</p>
            </>
          )}
        </div>

        {error && (
          <div className="border border-[oklch(35%_0.14_25)] rounded px-4 py-3 text-xs text-[var(--danger)] font-mono bg-[oklch(8%_0.05_25)]">
            ✕ {error}
          </div>
        )}
        {warning && (
          <div className="border border-[oklch(35%_0.12_72)] rounded px-4 py-3 text-xs text-[var(--warn)] font-mono bg-[oklch(8%_0.04_72)]">
            ⚠ {warning}
          </div>
        )}

        {transactions.length > 0 && (
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest uppercase">Transactions · {transactions.length}</span>
              <span className="text-[10px] font-mono text-[var(--ok)]">Written to Google Sheet</span>
            </div>
            <div className="overflow-y-auto max-h-[480px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Date", "Description", "Category", "Account", "Amount"].map(h => (
                      <th key={h} className="text-left text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase px-4 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[oklch(8%_0_0)] transition-colors">
                      <td className="px-4 py-2 font-mono text-[var(--ink-3)] whitespace-nowrap">{t.date}</td>
                      <td className="px-4 py-2 text-[var(--ink-1)] max-w-[220px] truncate">{t.description}</td>
                      <td className="px-4 py-2 whitespace-nowrap"><CategoryBadge category={t.category} /></td>
                      <td className="px-4 py-2 font-mono text-[var(--ink-3)] capitalize">{t.account}</td>
                      <td className={`px-4 py-2 font-mono tabular-nums text-right whitespace-nowrap ${t.amount >= 0 ? "text-[var(--ok)]" : "text-[var(--ink-1)]"}`}>
                        {t.amount >= 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Right: upload summary */}
      <div className="flex flex-col gap-4">
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="border-b border-[var(--border)] px-4 py-2.5">
            <span className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest uppercase">Statement Summary</span>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {[
              { label: "INCOME", val: totalIncome, prefix: "+",                      color: "text-[var(--ok)]" },
              { label: "SPEND",  val: totalSpend,  prefix: "-",                      color: "text-[var(--danger)]" },
              { label: "NET",    val: net,          prefix: net >= 0 ? "+" : "-",    color: net >= 0 ? "text-[var(--ok)]" : "text-[var(--danger)]" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest">{row.label}</span>
                <span className={`text-sm font-mono tabular-nums ${row.color}`}>
                  {row.prefix}${Math.abs(row.val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {byCategory.length > 0 && (
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="border-b border-[var(--border)] px-4 py-2.5">
              <span className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest uppercase">Spend by Category</span>
            </div>
            <div className="p-4 flex flex-col gap-2.5">
              {byCategory.slice(0, 8).map(([cat, amt]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <CategoryBadge category={cat} />
                    <span className="text-xs font-mono tabular-nums text-[var(--ink-2)]">
                      ${amt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-0.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div className="h-full bg-[var(--ink-3)] rounded-full" style={{ width: `${Math.round((amt / totalSpend) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border border-[var(--border)] rounded-lg p-4">
          <p className="text-[10px] font-mono text-[var(--ink-3)] leading-relaxed">
            <span className="text-[var(--ok)]">🔒 Private</span><br />
            PDFs are processed server-side and never stored. Transactions are written directly to your Google Sheet.
          </p>
        </div>
      </div>
    </>
  );
}
