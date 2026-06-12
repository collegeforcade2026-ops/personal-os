import Link from "next/link";
import { Panel } from "./Panel";
import { getTransactionSummary } from "@/lib/data/getTransactionSummary";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export async function FinancePulseCard() {
  const summary = await getTransactionSummary();

  if (!summary) {
    return (
      <Panel label="FINANCE PULSE" labelNum="07">
        <p className="text-[10px] font-mono text-[var(--ink-3)] mb-3">No data yet.</p>
        <Link href="/finance" className="text-[10px] font-mono text-[var(--accent)] hover:underline">
          Upload a statement →
        </Link>
      </Panel>
    );
  }

  const { totalIncome, totalSpend, net, topCategory, monthLabel, transactionCount } = summary;
  const isPositive = net >= 0;
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;

  // Spend bar widths (relative to total spend)
  const spendPct = totalIncome > 0 ? Math.min(Math.round((totalSpend / totalIncome) * 100), 100) : 0;

  return (
    <Panel label="FINANCE PULSE" labelNum="07" action={
      <Link href="/finance" className="text-[10px] font-mono text-[var(--ink-3)] hover:text-[var(--ink-1)] tracking-widest uppercase">
        UPLOAD
      </Link>
    }>
      <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-1">{monthLabel}</p>

      {/* Net */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-2xl font-mono tabular ${isPositive ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
          {isPositive ? "+" : ""}{fmt(net)}
        </span>
        <span className="text-[10px] font-mono text-[var(--ink-3)]">net</span>
      </div>

      {/* Income vs Spend bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[9px] font-mono text-[var(--ink-3)] mb-1">
          <span>SPEND {fmt(totalSpend)}</span>
          <span>INCOME {fmt(totalIncome)}</span>
        </div>
        <div className="h-1 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${spendPct > 90 ? "bg-[var(--danger)]" : spendPct > 70 ? "bg-[var(--warn)]" : "bg-[var(--ok)]"}`}
            style={{ width: `${spendPct}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">SAVINGS</p>
          <p className={`text-sm font-mono tabular ${savingsRate >= 0 ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
            {savingsRate}%
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">TOP SPEND</p>
          <p className="text-[10px] font-mono text-[var(--ink-1)] truncate">{topCategory}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">TXN</p>
          <p className="text-sm font-mono tabular text-[var(--ink-1)]">{transactionCount}</p>
        </div>
      </div>
    </Panel>
  );
}
