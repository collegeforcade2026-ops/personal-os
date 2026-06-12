"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Balance, BalanceSummary, NetWorthSnapshot } from "@/lib/types/finance";
import type { TransactionSummary } from "@/lib/data/getTransactionSummary";
import { accountBucket, summariseBalances, LIQUID_ACCOUNTS, INVESTED_ACCOUNTS, LIABILITY_ACCOUNTS } from "@/lib/types/finance";
import { UploadZone } from "./UploadZone";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 0) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: dec });
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, color, id }: { values: number[]; color: string; id: string }) {
  // Need at least 2 points — duplicate single point for a flat line
  const data = values.length === 0 ? [] : values.length === 1 ? [values[0], values[0]] : values;
  if (data.length < 2) return <div className="h-12 w-full opacity-20 bg-gradient-to-b from-white/5 to-transparent" />;
  const W = 400; const H = 48;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - 4 - ((v - min) / range) * (H - 10),
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── BucketCard ───────────────────────────────────────────────────────────────

function BucketCard({
  label, num, total, netWorth, accounts, spark, sparkColor, onEdit, isLiability = false,
}: {
  label: string; num: string; total: number; netWorth: number;
  accounts: Balance[]; spark: number[]; sparkColor: string;
  onEdit: (b: Balance) => void; isLiability?: boolean;
}) {
  const pct = netWorth > 0 ? Math.round((total / netWorth) * 100) : 0;
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden flex flex-col">
      <div className="p-5 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-mono text-[#666] tracking-widest">{num} // {label}</span>
          <span className="text-[9px] font-mono text-[#666]">{pct}% OF NET</span>
        </div>
        <p className="text-3xl font-mono font-semibold text-white">
          {isLiability && total > 0 ? `-${fmt(total)}` : fmt(total)}
        </p>
      </div>
      <Sparkline values={spark} color={sparkColor} id={num} />
      <div className="p-5 pt-4 grid grid-cols-2 gap-x-8 gap-y-4 flex-1">
        {accounts.length > 0 ? accounts.map(b => (
          <div key={b.account} className="group cursor-pointer" onClick={() => onEdit(b)}>
            <p className="text-[9px] font-mono text-[#666] uppercase tracking-widest mb-0.5">{b.account}</p>
            <p className={`text-sm font-mono group-hover:opacity-70 transition-opacity ${isLiability ? "text-[#e06c6c]" : "text-[#d4d4d4]"}`}>
              {isLiability && Math.abs(b.balance) > 0 ? "-" : ""}{fmt(Math.abs(b.balance))}
            </p>
          </div>
        )) : (
          <p className="col-span-2 text-[9px] font-mono text-[#555] italic">None added yet</p>
        )}
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  editing, newAccount, setNewAccount, inputVal, setInputVal, saving,
  suggestions, onSave, onClose, isAdding,
}: {
  editing: Balance | null; newAccount: string; setNewAccount: (v: string) => void;
  inputVal: string; setInputVal: (v: string) => void; saving: boolean;
  suggestions: string[]; onSave: () => void; onClose: () => void; isAdding: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
        <p className="text-[9px] font-mono text-[#666] uppercase tracking-widest mb-5">
          {editing ? `Edit · ${editing.account}` : "Add Account"}
        </p>
        {isAdding && (
          <>
            <input
              type="text" placeholder="Account name" value={newAccount}
              onChange={e => setNewAccount(e.target.value)}
              className="w-full bg-transparent border-b border-[#2f2f2f] text-sm font-mono text-white focus:outline-none focus:border-[#555] pb-1.5 mb-4 placeholder:text-[#555]"
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {suggestions.map(s => (
                  <button key={s} onClick={() => setNewAccount(s)}
                    className={`text-[9px] font-mono px-2 py-1 rounded-md border transition-colors ${newAccount === s ? "border-green-500/40 text-green-400" : "border-[#222] text-[#666] hover:border-[#3a3a3a] hover:text-[#888]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm text-[#666] font-mono">$</span>
          <input
            autoFocus type="number" value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onClose(); }}
            className="flex-1 bg-transparent border-b border-green-500/30 text-xl font-mono text-white focus:outline-none focus:border-green-500/60 pb-1"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onSave} disabled={saving}
            className="flex-1 text-[11px] font-mono font-medium text-black bg-white hover:bg-white/90 disabled:opacity-30 py-2.5 rounded-xl transition-colors">
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose}
            className="px-4 text-[11px] font-mono text-[#666] hover:text-white border border-[#222] hover:border-[#333] rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  initialSummary: BalanceSummary;
  history: NetWorthSnapshot[];
  txnSummary: TransactionSummary | null;
}

export function FinanceDashboard({ initialSummary, history, txnSummary }: Props) {
  const [balances, setBalances] = useState<Balance[]>(initialSummary.balances);
  const [editing, setEditing] = useState<Balance | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [newAccount, setNewAccount] = useState("");
  const [saving, setSaving] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const investmentInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const summary = summariseBalances(balances);
  const { liquid, invested, liabilities, netWorth } = summary;

  const liquidAccounts   = balances.filter(b => accountBucket(b.account) === "liquid");
  const investedAccounts = balances.filter(b => accountBucket(b.account) === "invested");
  const liabilityAccounts = balances.filter(b => accountBucket(b.account) === "liability");

  // Sparkline data: history is newest-first, reverse for left→right
  const rev = [...history].reverse();
  const sparkNet        = rev.map(h => h.netWorth);
  const sparkLiquid     = rev.map(h => h.liquid);
  const sparkInvested   = rev.map(h => h.invested);
  const sparkLiabilities = rev.map(h => h.liabilities);

  // Monthly delta
  const [latest, prior] = history;
  const monthDelta = latest && prior ? latest.netWorth - prior.netWorth : null;
  const monthPct   = latest && prior
    ? ((latest.netWorth - prior.netWorth) / Math.abs(prior.netWorth) * 100).toFixed(1)
    : null;

  // Runway (months of liquid / monthly burn)
  const runway = txnSummary?.totalSpend && txnSummary.totalSpend > 0
    ? Math.round(liquid / txnSummary.totalSpend)
    : null;

  const saveRate = txnSummary && txnSummary.totalIncome > 0
    ? Math.round((txnSummary.net / txnSummary.totalIncome) * 100)
    : null;

  const existingNames = new Set(balances.map(b => b.account));
  const ALL_ACCOUNTS = [...LIQUID_ACCOUNTS, ...INVESTED_ACCOUNTS, ...LIABILITY_ACCOUNTS];
  const suggestions = ALL_ACCOUNTS.filter(a => !existingNames.has(a));

  async function save(account: string, balance: number, row?: number) {
    setSaving(true);
    try {
      const res = await fetch("/api/finance/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, balance, row }),
      });
      const data = await res.json() as { ok?: boolean; updated_at?: string };
      if (data.ok) {
        setBalances(prev => {
          const existing = prev.find(b => b.account === account);
          if (existing) return prev.map(b => b.account === account ? { ...b, balance, updated_at: data.updated_at ?? "" } : b);
          return [...prev, { account, balance, updated_at: data.updated_at ?? "", row: prev.length + 2 }];
        });
      }
    } finally {
      setSaving(false);
      setEditing(null);
      setShowAdd(false);
      setNewAccount("");
      setInputVal("");
    }
  }

  async function clearAllData() {
    setClearing(true);
    try {
      const res = await fetch("/api/finance/clear", { method: "POST" });
      if (res.ok) {
        setShowClearConfirm(false);
        router.refresh(); // re-runs server component to pull fresh (empty) data
      }
    } finally {
      setClearing(false);
    }
  }

  function handleSave() {
    const v = parseFloat(inputVal);
    if (isNaN(v)) return;
    if (editing) save(editing.account, v, editing.row);
    else if (newAccount.trim()) save(newAccount.trim(), v);
  }

  function startEdit(b: Balance) {
    setEditing(b);
    setShowAdd(false);
    setInputVal(String(b.balance));
  }

  async function importInvestmentStatement(file: File) {
    if (file.type !== "application/pdf") { setImportMsg("PDF only"); setImportStatus("error"); return; }
    setImportStatus("reading");
    setImportMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/finance/upload-investment", { method: "POST", body: fd });
      const data = await res.json() as { ok?: boolean; brokerage?: string; totalValue?: number; updated_at?: string; error?: string };
      if (!res.ok || !data.ok) {
        setImportMsg(data.error ?? "Could not read statement");
        setImportStatus("error");
      } else {
        const { brokerage, totalValue, updated_at } = data;
        setBalances(prev => {
          const ex = prev.find(b => b.account === brokerage);
          if (ex) return prev.map(b => b.account === brokerage ? { ...b, balance: totalValue!, updated_at: updated_at ?? "" } : b);
          return [...prev, { account: brokerage!, balance: totalValue!, updated_at: updated_at ?? "", row: prev.length + 2 }];
        });
        setImportMsg(`${brokerage} · ${fmt(totalValue!)} saved`);
        setImportStatus("done");
        setTimeout(() => { setImportStatus("idle"); setImportMsg(null); }, 5000);
      }
    } catch {
      setImportMsg("Network error");
      setImportStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 text-white">
      <p className="text-[9px] font-mono text-[#666] tracking-[0.2em] uppercase mb-5">Finance</p>

      {/* ── Row 1: Stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-3">

        {/* Net Worth */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 flex flex-col">
          <p className="text-[9px] font-mono text-[#666] tracking-widest uppercase mb-3">NET WORTH · LIVE</p>
          <p className="text-4xl font-mono font-semibold text-white mb-2">{fmt(netWorth)}</p>
          {monthPct && (
            <span className={`self-start text-[9px] font-mono px-2 py-0.5 rounded-md mb-3 ${monthDelta! >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {monthDelta! >= 0 ? "▲" : "▼"} {monthPct}% · 30D
            </span>
          )}
          <div className="mt-auto -mx-1 pt-2">
            <Sparkline values={sparkNet} color="#22c55e" id="net" />
          </div>
        </div>

        {/* Runway */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
          <p className="text-[9px] font-mono text-[#666] tracking-widest uppercase mb-3">RUNWAY</p>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-4xl font-mono font-semibold text-white">{runway ?? "—"}</span>
            {runway !== null && <span className="text-lg font-mono text-[#555]">mo</span>}
          </div>
          <p className="text-[9px] font-mono text-[#666] mb-0.5">@ current burn · static</p>
          {txnSummary && <p className="text-[9px] font-mono text-[#666]">{txnSummary.monthLabel}</p>}
        </div>

        {/* Income / Mo */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
          <p className="text-[9px] font-mono text-[#666] tracking-widest uppercase mb-3">INCOME / MO</p>
          {txnSummary ? (
            <>
              <p className="text-4xl font-mono font-semibold text-green-400 mb-2">{fmt(txnSummary.totalIncome)}</p>
              <p className="text-[9px] font-mono text-[#666] mb-0.5">{txnSummary.monthLabel}</p>
              {saveRate !== null && (
                <p className="text-[9px] font-mono text-[#666]">{saveRate}% save rate</p>
              )}
            </>
          ) : (
            <p className="text-3xl font-mono text-[#2a2a2a]">$[—]</p>
          )}
        </div>

        {/* Burn / Mo */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
          <p className="text-[9px] font-mono text-[#666] tracking-widest uppercase mb-3">BURN / MO</p>
          {txnSummary ? (
            <>
              <p className="text-4xl font-mono font-semibold text-[#e06c6c] mb-2">{fmt(txnSummary.totalSpend)}</p>
              <p className="text-[9px] font-mono text-[#666] mb-0.5">{txnSummary.monthLabel}</p>
              <p className="text-[9px] font-mono text-[#666]">top: {txnSummary.topCategory}</p>
            </>
          ) : (
            <p className="text-3xl font-mono text-[#2a2a2a]">$[—]</p>
          )}
        </div>
      </div>

      {/* ── Row 2: Bucket cards ────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-3">

        {/* a1 Liquid Cash */}
        <BucketCard
          label="LIQUID CASH" num="a1" total={liquid} netWorth={netWorth}
          accounts={liquidAccounts} spark={sparkLiquid} sparkColor="#22c55e"
          onEdit={startEdit}
        />

        {/* a2 Invested Assets — inline for import button */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden flex flex-col">
          <div className="p-5 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono text-[#666] tracking-widest">a2 // INVESTED ASSETS</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#666]">
                  {netWorth > 0 ? Math.round((invested / netWorth) * 100) : 0}% OF NET
                </span>
                <button
                  onClick={() => investmentInputRef.current?.click()}
                  disabled={importStatus === "reading"}
                  className="text-[9px] font-mono text-[#666] hover:text-green-400 disabled:opacity-30 border border-[#222] px-1.5 py-0.5 rounded transition-colors"
                >
                  {importStatus === "reading" ? "reading…" : "↑ import"}
                </button>
                <input ref={investmentInputRef} type="file" accept="application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) importInvestmentStatement(f); e.target.value = ""; }} />
              </div>
            </div>
            {importMsg && (
              <p className={`text-[9px] font-mono mb-1 ${importStatus === "error" ? "text-[#e06c6c]" : "text-green-400"}`}>
                {importStatus === "error" ? "✕ " : "✓ "}{importMsg}
              </p>
            )}
            <p className="text-3xl font-mono font-semibold text-white">{fmt(invested)}</p>
          </div>
          <Sparkline values={sparkInvested} color="#22c55e" id="a2" />
          <div className="p-5 pt-4 grid grid-cols-2 gap-x-8 gap-y-4 flex-1">
            {investedAccounts.length > 0 ? investedAccounts.map(b => (
              <div key={b.account} className="group cursor-pointer" onClick={() => startEdit(b)}>
                <p className="text-[9px] font-mono text-[#666] uppercase tracking-widest mb-0.5">{b.account}</p>
                <p className="text-sm font-mono text-[#d4d4d4] group-hover:opacity-70 transition-opacity">{fmt(b.balance)}</p>
              </div>
            )) : (
              <p className="col-span-2 text-[9px] font-mono text-[#2f2f2f] italic">Import a statement or add manually</p>
            )}
          </div>
        </div>

        {/* a3 Liabilities */}
        <BucketCard
          label="LIABILITIES" num="a3" total={liabilities} netWorth={netWorth}
          accounts={liabilityAccounts} spark={sparkLiabilities} sparkColor="#e06c6c"
          onEdit={startEdit} isLiability
        />
      </div>

      {/* ── Row 3: Snapshot History ───────────────────────────── */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden mb-3">
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#1a1a1a]">
          <span className="text-[9px] font-mono text-[#666] tracking-widest">a4 // SNAPSHOT HISTORY</span>
          <span className="text-[9px] font-mono text-[#555]">MONTHLY · {history.length}MO</span>
        </div>
        {history.length === 0 ? (
          <p className="px-6 py-5 text-[10px] font-mono text-[#555]">Populates automatically when you save balances.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#181818]">
                  {["PERIOD", "NET WORTH", "LIQUID", "INVESTED", "LIABILITIES", "Δ VS PRIOR"].map(h => (
                    <th key={h} className="text-left text-[9px] font-mono text-[#666] tracking-widest uppercase px-6 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => (
                  <tr key={row.period} className={`border-b border-[#161616] last:border-0 transition-colors ${i === 0 ? "bg-white/[0.025]" : "hover:bg-white/[0.015]"}`}>
                    <td className="px-6 py-3 font-mono text-[#666] text-sm whitespace-nowrap">{row.periodLabel}</td>
                    <td className="px-6 py-3 font-mono text-white text-sm tabular-nums whitespace-nowrap">{fmt(row.netWorth)}</td>
                    <td className="px-6 py-3 font-mono text-[#aaa] text-sm tabular-nums whitespace-nowrap">{fmt(row.liquid)}</td>
                    <td className="px-6 py-3 font-mono text-[#aaa] text-sm tabular-nums whitespace-nowrap">{fmt(row.invested)}</td>
                    <td className="px-6 py-3 font-mono text-[#e06c6c]/70 text-sm tabular-nums whitespace-nowrap">
                      {row.liabilities > 0 ? `-${fmt(row.liabilities)}` : "—"}
                    </td>
                    <td className={`px-6 py-3 font-mono text-sm tabular-nums whitespace-nowrap ${row.delta === 0 ? "text-[#555]" : row.delta > 0 ? "text-green-400" : "text-[#e06c6c]"}`}>
                      {row.delta === 0 ? "—" : `${row.delta > 0 ? "+" : ""}${fmt(row.delta)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add account + Clear ───────────────────────────────── */}
      <div className="flex justify-end gap-2 mb-3">
        <button onClick={() => setShowClearConfirm(true)}
          className="text-[9px] font-mono text-[#555] hover:text-[#e06c6c] border border-[#1f1f1f] hover:border-[#e06c6c]/30 px-3 py-1.5 rounded-lg transition-colors">
          clear all data
        </button>
        <button onClick={() => { setShowAdd(true); setEditing(null); setInputVal(""); setNewAccount(""); }}
          className="text-[9px] font-mono text-[#666] hover:text-white border border-[#1f1f1f] hover:border-[#333] px-3 py-1.5 rounded-lg transition-colors">
          + add account
        </button>
      </div>

      {/* ── a5: Statement Upload ──────────────────────────────── */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="px-6 py-3 border-b border-[#1a1a1a]">
          <span className="text-[9px] font-mono text-[#666] tracking-widest">a5 // STATEMENT UPLOAD</span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-[1fr_280px] gap-6">
            <UploadZone />
          </div>
        </div>
      </div>

      {/* ── Clear confirmation modal ──────────────────────────── */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-[9px] font-mono text-[#666] uppercase tracking-widest mb-3">Confirm Clear</p>
            <p className="text-sm font-mono text-white mb-1">Delete all finance data?</p>
            <p className="text-[10px] font-mono text-[#666] mb-5">
              This clears Transactions, Balances, and Net Worth History from your Google Sheet. Cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={clearAllData} disabled={clearing}
                className="flex-1 text-[11px] font-mono font-medium text-white bg-[#e06c6c]/20 hover:bg-[#e06c6c]/30 border border-[#e06c6c]/30 disabled:opacity-40 py-2.5 rounded-xl transition-colors">
                {clearing ? "Clearing…" : "Yes, clear everything"}
              </button>
              <button onClick={() => setShowClearConfirm(false)}
                className="px-4 text-[11px] font-mono text-[#666] hover:text-white border border-[#222] hover:border-[#333] rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit / Add modal ──────────────────────────────────── */}
      {(editing || showAdd) && (
        <EditModal
          editing={editing}
          newAccount={newAccount}
          setNewAccount={setNewAccount}
          inputVal={inputVal}
          setInputVal={setInputVal}
          saving={saving}
          suggestions={suggestions}
          onSave={handleSave}
          onClose={() => { setEditing(null); setShowAdd(false); setInputVal(""); setNewAccount(""); }}
          isAdding={showAdd && !editing}
        />
      )}
    </div>
  );
}
