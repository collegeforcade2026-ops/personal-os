import Link from "next/link";
import { Panel } from "./Panel";
import { getBalanceSummary } from "@/lib/data/getBalances";
import { getNetWorthHistory } from "@/lib/data/getNetWorthHistory";
import { getTransactionSummary } from "@/lib/data/getTransactionSummary";

function fmt(n: number, dec = 0) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: dec });
}

function pctStr(current: number, prior: number) {
  if (!prior) return null;
  const p = ((current - prior) / Math.abs(prior)) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}

export async function FinancePulseCard() {
  const [summary, history, txnSummary] = await Promise.all([
    getBalanceSummary(),
    getNetWorthHistory(),
    getTransactionSummary(),
  ]);

  const { netWorth, liquid, invested, liabilities } = summary;
  const hasBalances = summary.balances.length > 0;

  // Monthly delta from snapshot history
  const [latest, prior] = history;
  const monthlyDelta = latest && prior ? latest.netWorth - prior.netWorth : null;
  const monthlyPct = latest && prior ? pctStr(latest.netWorth, prior.netWorth) : null;

  const totalSpend  = txnSummary?.totalSpend ?? 0;
  const totalIncome = txnSummary?.totalIncome ?? 0;
  const net         = txnSummary?.net ?? 0;
  const topCategory = txnSummary?.topCategory ?? null;
  const monthLabel  = txnSummary?.monthLabel ?? null;
  const spendPct = totalIncome > 0
    ? Math.min(Math.round((totalSpend / totalIncome) * 100), 100)
    : 0;

  if (!hasBalances) {
    return (
      <Panel label="FINANCE PULSE" labelNum="07">
        <p className="text-[10px] font-mono text-[var(--ink-3)] mb-3">No balances saved yet.</p>
        <Link href="/finance" className="text-[10px] font-mono text-[var(--accent)] hover:underline">
          Add your accounts →
        </Link>
      </Panel>
    );
  }

  return (
    <Panel label="FINANCE PULSE" labelNum="07" action={
      <Link href="/finance" className="text-[10px] font-mono text-[var(--ink-3)] hover:text-[var(--ink-1)] tracking-widest uppercase">
        MANAGE
      </Link>
    }>
      {/* Net worth — primary number */}
      <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-0.5">NET WORTH</p>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-mono tabular text-[var(--ink-0)]">{fmt(netWorth)}</span>
        {monthlyPct && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${monthlyDelta! >= 0 ? "bg-[var(--ok)]/10 text-[var(--ok)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"}`}>
            {monthlyDelta! >= 0 ? "▲" : "▼"} {monthlyPct} · 30D
          </span>
        )}
      </div>

      {/* Buckets */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "LIQUID",   val: liquid },
          { label: "INVESTED", val: invested },
          { label: "DEBT",     val: liabilities, neg: true },
        ].map(row => (
          <div key={row.label}>
            <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">{row.label}</p>
            <p className={`text-xs font-mono tabular ${row.neg ? "text-[var(--danger)]" : "text-[var(--ink-1)]"}`}>
              {row.neg ? "-" : ""}{fmt(row.val)}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] my-2" />

      {/* Cash flow from statement */}
      {txnSummary && monthLabel ? (
        <>
          <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-1">{monthLabel} · CASH FLOW</p>
          <div className="flex justify-between text-[9px] font-mono mb-1">
            <span className="text-[var(--ink-3)]">SPEND {fmt(totalSpend)}</span>
            <span className={net >= 0 ? "text-[var(--ok)]" : "text-[var(--danger)]"}>
              NET {net >= 0 ? "+" : ""}{fmt(net)}
            </span>
          </div>
          <div className="h-0.5 rounded-full bg-[var(--border)] overflow-hidden mb-1.5">
            <div className={`h-full rounded-full ${spendPct > 90 ? "bg-[var(--danger)]" : spendPct > 70 ? "bg-[var(--warn)]" : "bg-[var(--ok)]"}`}
              style={{ width: `${spendPct}%` }} />
          </div>
          {topCategory && (
            <p className="text-[9px] font-mono text-[var(--ink-3)]">
              TOP SPEND · <span className="text-[var(--ink-2)]">{topCategory}</span>
            </p>
          )}
        </>
      ) : (
        <Link href="/finance" className="text-[9px] font-mono text-[var(--ink-3)] hover:text-[var(--accent)]">
          Upload a statement →
        </Link>
      )}
    </Panel>
  );
}
