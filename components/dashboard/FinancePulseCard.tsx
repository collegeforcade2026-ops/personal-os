import Link from "next/link";
import { Panel } from "./Panel";
import { getTransactionSummary } from "@/lib/data/getTransactionSummary";
import { getBalances } from "@/lib/data/getBalances";

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: decimals });
}

export async function FinancePulseCard() {
  const [balances, summary] = await Promise.all([getBalances(), getTransactionSummary()]);

  const checking = balances.find(b => b.account.toLowerCase().includes("checking"));
  const savings  = balances.find(b => b.account.toLowerCase().includes("saving") || b.account.toLowerCase().includes("hysa"));
  const brokerage = balances.find(b => b.account.toLowerCase().includes("brokerage") || b.account.toLowerCase().includes("invest"));
  const cc = balances.find(b => b.account.toLowerCase().includes("credit"));

  const totalAssets = balances.filter(b => !b.account.toLowerCase().includes("credit")).reduce((s, b) => s + b.balance, 0);
  const totalDebt = cc ? Math.abs(cc.balance) : 0;
  const netWorth = totalAssets - totalDebt;

  const { totalIncome, totalSpend, net, topCategory, monthLabel } = summary ?? {};
  const spendPct = totalIncome && totalSpend ? Math.min(Math.round((totalSpend / totalIncome) * 100), 100) : 0;

  const hasBalances = balances.length > 0;

  return (
    <Panel label="FINANCE PULSE" labelNum="07" action={
      <Link href="/finance" className="text-[10px] font-mono text-[var(--ink-3)] hover:text-[var(--ink-1)] tracking-widest uppercase">
        MANAGE
      </Link>
    }>
      {!hasBalances ? (
        <>
          <p className="text-[10px] font-mono text-[var(--ink-3)] mb-3">No balances saved yet.</p>
          <Link href="/finance" className="text-[10px] font-mono text-[var(--accent)] hover:underline">
            Add your accounts →
          </Link>
        </>
      ) : (
        <>
          {/* Primary: Checking balance */}
          {checking && (
            <div className="mb-3">
              <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-0.5">CHECKING</p>
              <span className="text-2xl font-mono tabular text-[var(--ink-0)]">
                {fmt(checking.balance, 2)}
              </span>
            </div>
          )}

          {/* Account balances grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {savings && (
              <div>
                <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">SAVINGS</p>
                <p className="text-xs font-mono tabular text-[var(--ink-1)]">{fmt(savings.balance)}</p>
              </div>
            )}
            {brokerage && (
              <div>
                <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">BROKERAGE</p>
                <p className="text-xs font-mono tabular text-[var(--ink-1)]">{fmt(brokerage.balance)}</p>
              </div>
            )}
            {cc && (
              <div>
                <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">CC DEBT</p>
                <p className="text-xs font-mono tabular text-[var(--danger)]">-{fmt(Math.abs(cc.balance))}</p>
              </div>
            )}
            <div>
              <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">NET WORTH</p>
              <p className={`text-xs font-mono tabular ${netWorth >= 0 ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
                {netWorth >= 0 ? "+" : ""}{fmt(netWorth)}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--border)] my-2" />

          {/* Monthly cash flow from statement */}
          {summary ? (
            <>
              <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-1">{monthLabel} · CASH FLOW</p>
              <div className="flex justify-between text-[9px] font-mono text-[var(--ink-3)] mb-1">
                <span>SPEND {totalSpend ? fmt(totalSpend) : "—"}</span>
                <span className={net && net >= 0 ? "text-[var(--ok)]" : "text-[var(--danger)]"}>
                  NET {net ? (net >= 0 ? "+" : "") + fmt(net) : "—"}
                </span>
              </div>
              <div className="h-0.5 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className={`h-full rounded-full ${spendPct > 90 ? "bg-[var(--danger)]" : spendPct > 70 ? "bg-[var(--warn)]" : "bg-[var(--ok)]"}`}
                  style={{ width: `${spendPct}%` }}
                />
              </div>
              {topCategory && (
                <p className="text-[9px] font-mono text-[var(--ink-3)] mt-1.5">
                  TOP SPEND · <span className="text-[var(--ink-2)]">{topCategory}</span>
                </p>
              )}
            </>
          ) : (
            <Link href="/finance" className="text-[9px] font-mono text-[var(--ink-3)] hover:text-[var(--accent)]">
              Upload a statement to see cash flow →
            </Link>
          )}
        </>
      )}
    </Panel>
  );
}
