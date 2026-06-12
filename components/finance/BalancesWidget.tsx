"use client";

import { useEffect, useState } from "react";
import type { Balance } from "@/lib/types/finance";
import { accountBucket, summariseBalances, LIQUID_ACCOUNTS, INVESTED_ACCOUNTS, LIABILITY_ACCOUNTS } from "@/lib/types/finance";

const ALL_DEFAULT_ACCOUNTS = [
  ...LIQUID_ACCOUNTS,
  ...INVESTED_ACCOUNTS,
  ...LIABILITY_ACCOUNTS,
];

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function BucketSection({ label, accounts, total, netWorth, onEdit }: {
  label: string;
  accounts: Balance[];
  total: number;
  netWorth: number;
  onEdit: (b: Balance) => void;
}) {
  const pct = netWorth > 0 ? Math.round((total / netWorth) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-[var(--ink-3)]">{pct}% of net</span>
          <span className="text-xs font-mono tabular text-[var(--ink-1)]">{fmt(total)}</span>
        </div>
      </div>
      {accounts.map(b => (
        <div key={b.account} className="flex items-center justify-between py-1.5 px-2 rounded group hover:bg-[oklch(8%_0_0)] transition-colors">
          <span className="text-[10px] font-mono text-[var(--ink-2)]">{b.account}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono tabular ${accountBucket(b.account) === "liability" ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>
              {accountBucket(b.account) === "liability" ? "-" : ""}{fmt(Math.abs(b.balance))}
            </span>
            <button onClick={() => onEdit(b)} className="text-[9px] font-mono text-[var(--ink-3)] opacity-0 group-hover:opacity-100 hover:text-[var(--accent)] transition-all">
              edit
            </button>
          </div>
        </div>
      ))}
      {accounts.length === 0 && (
        <p className="text-[9px] font-mono text-[var(--ink-3)] italic px-2">None added yet</p>
      )}
    </div>
  );
}

export function BalancesWidget() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [editing, setEditing] = useState<Balance | null>(null);
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
      setNewAccount("");
      setShowAdd(false);
    }
  }

  function startEdit(b: Balance) {
    setEditing(b);
    setInputVal(String(b.balance));
  }

  const summary = summariseBalances(balances);
  const { liquid, invested, liabilities, netWorth } = summary;

  const liquidAccounts   = balances.filter(b => accountBucket(b.account) === "liquid");
  const investedAccounts = balances.filter(b => accountBucket(b.account) === "invested");
  const liabilityAccounts = balances.filter(b => accountBucket(b.account) === "liability");

  const existingNames = new Set(balances.map(b => b.account));
  const suggestions = ALL_DEFAULT_ACCOUNTS.filter(a => !existingNames.has(a));

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest uppercase">Account Balances</span>
        <button onClick={() => setShowAdd(v => !v)} className="text-[10px] font-mono text-[var(--ink-3)] hover:text-[var(--ink-1)]">
          {showAdd ? "cancel" : "+ add"}
        </button>
      </div>

      <div className="p-4">
        <BucketSection label="Liquid Cash"      accounts={liquidAccounts}    total={liquid}      netWorth={netWorth} onEdit={startEdit} />
        <BucketSection label="Invested Assets"  accounts={investedAccounts}  total={invested}    netWorth={netWorth} onEdit={startEdit} />
        <BucketSection label="Liabilities"      accounts={liabilityAccounts} total={liabilities} netWorth={netWorth} onEdit={startEdit} />
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="border-t border-[var(--border)] px-4 py-3 bg-[oklch(7%_0_0)]">
          <p className="text-[9px] font-mono text-[var(--ink-3)] mb-2 tracking-widest uppercase">Editing · {editing.account}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--ink-3)]">$</span>
            <input
              autoFocus
              type="number"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { const v = parseFloat(inputVal); if (!isNaN(v)) save(editing.account, v, editing.row); }
                if (e.key === "Escape") setEditing(null);
              }}
              className="flex-1 bg-transparent border-b border-[var(--accent)] text-sm font-mono text-[var(--ink-0)] focus:outline-none"
            />
            <button onClick={() => { const v = parseFloat(inputVal); if (!isNaN(v)) save(editing.account, v, editing.row); }} disabled={saving} className="text-[10px] font-mono text-[var(--ok)] disabled:opacity-50">
              {saving ? "saving…" : "save"}
            </button>
            <button onClick={() => setEditing(null)} className="text-[10px] font-mono text-[var(--ink-3)]">cancel</button>
          </div>
        </div>
      )}

      {/* Add account */}
      {showAdd && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {suggestions.map(s => (
                <button key={s} onClick={() => setNewAccount(s)}
                  className={`text-[9px] font-mono px-2 py-1 rounded border transition-colors ${newAccount === s ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--ink-3)] hover:border-[var(--ink-3)]"}`}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Account name" value={newAccount} onChange={e => setNewAccount(e.target.value)}
              className="flex-1 bg-transparent border-b border-[var(--border)] text-xs font-mono text-[var(--ink-1)] focus:outline-none focus:border-[var(--accent)] pb-0.5" />
            <span className="text-xs text-[var(--ink-3)]">$</span>
            <input type="number" placeholder="0" value={inputVal} onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newAccount.trim()) { const v = parseFloat(inputVal); if (!isNaN(v)) save(newAccount.trim(), v); } }}
              className="w-24 bg-transparent border-b border-[var(--border)] text-xs font-mono text-right text-[var(--ink-0)] focus:outline-none focus:border-[var(--accent)] pb-0.5" />
            <button onClick={() => { const v = parseFloat(inputVal); if (newAccount.trim() && !isNaN(v)) save(newAccount.trim(), v); }} disabled={saving || !newAccount.trim()}
              className="text-[10px] font-mono text-[var(--ok)] disabled:opacity-30">{saving ? "…" : "add"}</button>
          </div>
        </div>
      )}

      {/* Net worth footer */}
      {balances.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3 grid grid-cols-2 gap-4 bg-[oklch(6%_0_0)]">
          <div>
            <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-0.5">Net Worth</p>
            <p className={`text-lg font-mono tabular font-semibold ${netWorth >= 0 ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
              {fmt(netWorth)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-0.5">LIQUID · INVESTED · DEBT</p>
            <p className="text-[10px] font-mono text-[var(--ink-2)]">{fmt(liquid)} · {fmt(invested)} · -{fmt(liabilities)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
