import type { NetWorthSnapshot } from "@/lib/types/finance";
import { getNetWorthHistory } from "@/lib/data/getNetWorthHistory";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export async function SnapshotHistory() {
  const history = await getNetWorthHistory();

  if (history.length === 0) {
    return (
      <div className="border border-[var(--border)] rounded-lg p-4">
        <p className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-1">Snapshot History</p>
        <p className="text-[10px] font-mono text-[var(--ink-3)]">
          Will populate automatically when you save balances. Updates each time you edit a balance.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest uppercase">
          Snapshot History · Monthly
        </span>
        <span className="text-[10px] font-mono text-[var(--ink-3)]">{history.length} months</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {["Period", "Net Worth", "Liquid", "Invested", "Liabilities", "Δ vs Prior"].map(h => (
                <th key={h} className="text-left text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase px-4 py-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((row: NetWorthSnapshot, i: number) => (
              <tr key={row.period} className={`border-b border-[var(--border)] last:border-0 ${i === 0 ? "bg-[oklch(8%_0_0)]" : ""}`}>
                <td className="px-4 py-2.5 font-mono text-[var(--ink-2)] whitespace-nowrap">{row.periodLabel}</td>
                <td className="px-4 py-2.5 font-mono tabular-nums text-[var(--ink-0)] whitespace-nowrap">{fmt(row.netWorth)}</td>
                <td className="px-4 py-2.5 font-mono tabular-nums text-[var(--ink-2)] whitespace-nowrap">{fmt(row.liquid)}</td>
                <td className="px-4 py-2.5 font-mono tabular-nums text-[var(--ink-2)] whitespace-nowrap">{fmt(row.invested)}</td>
                <td className="px-4 py-2.5 font-mono tabular-nums text-[var(--danger)] whitespace-nowrap">-{fmt(row.liabilities)}</td>
                <td className={`px-4 py-2.5 font-mono tabular-nums whitespace-nowrap ${row.delta >= 0 ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
                  {row.delta === 0 ? "—" : `${row.delta >= 0 ? "+" : ""}${fmt(row.delta)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
