"use client";

import { useEffect, useState } from "react";
import type { Balance } from "@/app/api/finance/balances/route";

const DEFAULT_ACCOUNTS = ["Checking", "Savings / HYSA", "Brokerage", "Credit Card"];

export function BalancesWidget() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [newAccount, setNewAccount] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetch("/api/finance/balances")
      .then(r => r.json())
      .then((d: { balances: Balance[] }) => setBalances(d.balances ?? []))
      .catch(() => {});
  }, []);

  async function save(account: string, balance: number, row?: number) {
    setSaving(true);
    try {
      const res = await fetch("/api/finance/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, balance, row }),
      });
      const data = await res.json() as { ok?: boolean; updated_at?: string; error?: string };
      if (data.ok) {
        setBalances(prev => {
          const existing = prev.find(b => b.account === account);
          if (existing) {
            return prev.map(b => b.account === account ? { ...b, balance, updated_at: data.updated_at ?? "" } : b);
          }
          return [...prev, { account, balance, updated_at: data.updated_at ?? "", row: prev.length + 2 }];
        });
      }
    } finally {
      setSaving(false);
      setEditing(null);
      setNewAccount("");
      setShowAdd(false);
    }
  }

  function startEdit(b: Balance) {
    setEditing(b.account);
    setInputVal(String(b.balance));
  }

  function commitEdit(b: Balance) {
    const val = parseFloat(inputVal);
    if (!isNaN(val)) save(b.account, val, b.row);
    else setEditing(null);
  }

  const totalAssets = balances
    .filter(b => b.account !== "Credit Card")
    .reduce((s, b) => s + b.balance, 0);
  const totalLiabilities = balances
    .filter(b => b.account === "Credit Card")
    .reduce((s, b) => s + b.balance, 0);
  const netWorth = totalAssets - Math.abs(totalLiabilities);

  // Accounts not yet added
  const existingNames = new Set(balances.map(b => b.account));
  const suggestions = DEFAULT_ACCOUNTS.filter(a => !existingNames.has(a));

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest uppercase">Account Balances</span>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-[10px] font-mono text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors"
        >
          {showAdd ? "cancel" : "+ add"}
        </button>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {balances.map(b => (
          <div key={b.account} className="flex items-center justify-between px-4 py-3 group">
            <div>
              <p className="text-xs font-mono text-[var(--ink-1)]">{b.account}</p>
              {b.updated_at && (
                <p className="text-[9px] font-mono text-[var(--ink-3)]">{b.updated_at}</p>
              )}
            </div>
            {editing === b.account ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--ink-3)]">$</span>
                <input
                  autoFocus
                  type="number"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitEdit(b);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="w-28 bg-transparent border-b border-[var(--accent)] text-xs font-mono text-right text-[var(--ink-0)] focus:outline-none"
                />
                <button
                  onClick={() => commitEdit(b)}
                  disabled={saving}
                  className="text-[10px] font-mono text-[var(--ok)] disabled:opacity-50"
                >
                  {saving ? "…" : "save"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className={`text-sm font-mono tabular ${b.account === "Credit Card" ? "text-[var(--danger)]" : "text-[var(--ink-0)]"}`}>
                  {b.account === "Credit Card" ? "-" : ""}${Math.abs(b.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <button
                  onClick={() => startEdit(b)}
                  className="text-[9px] font-mono text-[var(--ink-3)] opacity-0 group-hover:opacity-100 hover:text-[var(--ink-1)] transition-all"
                >
                  edit
                </button>
              </div>
            )}
          </div>
        ))}

        {balances.length === 0 && !showAdd && (
          <div className="px-4 py-6 text-center">
            <p className="text-[10px] font-mono text-[var(--ink-3)]">No balances saved yet.</p>
            <button onClick={() => setShowAdd(true)} className="text-[10px] font-mono text-[var(--accent)] mt-1 hover:underline">
              Add your first account
            </button>
          </div>
        )}
      </div>

      {/* Add account */}
      {showAdd && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => setNewAccount(s)}
                  className={`text-[9px] font-mono px-2 py-1 rounded border transition-colors ${
                    newAccount === s
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--ink-3)] hover:border-[var(--ink-3)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Account name"
              value={newAccount}
              onChange={e => setNewAccount(e.target.value)}
              className="flex-1 bg-transparent border-b border-[var(--border)] text-xs font-mono text-[var(--ink-1)] focus:outline-none focus:border-[var(--accent)] pb-0.5"
            />
            <span className="text-xs text-[var(--ink-3)]">$</span>
            <input
              type="number"
              placeholder="0.00"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newAccount.trim()) {
                  const val = parseFloat(inputVal);
                  if (!isNaN(val)) save(newAccount.trim(), val);
                }
              }}
              className="w-24 bg-transparent border-b border-[var(--border)] text-xs font-mono text-right text-[var(--ink-0)] focus:outline-none focus:border-[var(--accent)] pb-0.5"
            />
            <button
              onClick={() => {
                const val = parseFloat(inputVal);
                if (newAccount.trim() && !isNaN(val)) save(newAccount.trim(), val);
              }}
              disabled={saving || !newAccount.trim()}
              className="text-[10px] font-mono text-[var(--ok)] disabled:opacity-30"
            >
              {saving ? "…" : "add"}
            </button>
          </div>
        </div>
      )}

      {/* Net worth total */}
      {balances.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-between bg-[oklch(6%_0_0)]">
          <span className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest uppercase">Net Worth</span>
          <span className={`text-sm font-mono tabular font-semibold ${netWorth >= 0 ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
            {netWorth >= 0 ? "+" : "-"}${Math.abs(netWorth).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}
