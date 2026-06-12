import { Panel } from "./Panel";
import { getFinanceData } from "@/lib/data/getFinanceData";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pct(a: number, b: number) {
  if (b === 0) return "—";
  const p = ((a - b) / b) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}

export async function FinancePulseCard() {
  const rows = await getFinanceData();

  const latest = rows[rows.length - 1];
  const prev = rows[rows.length - 2];

  const netWorth = latest?.net_worth ?? 0;
  const prevNetWorth = prev?.net_worth ?? netWorth;
  const delta = netWorth - prevNetWorth;
  const deltaPositive = delta >= 0;

  // Sparkline: last 12 net worth values
  const sparkData = rows.slice(-12).map((r) => r.net_worth);
  const sparkMin = Math.min(...sparkData);
  const sparkMax = Math.max(...sparkData);
  const sparkRange = sparkMax - sparkMin || 1;

  return (
    <Panel
      label="FINANCE PULSE"
      labelNum="07"
      action={
        <span className="text-[10px] font-mono text-[var(--ok)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] inline-block" />
          LIVE
        </span>
      }
    >
      <p className="text-[10px] font-mono text-[var(--ink-2)] tracking-widest uppercase mb-1">Net Worth</p>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl font-mono tabular text-[var(--ink-0)]">
          {netWorth > 0 ? fmt(netWorth) : "—"}
        </span>
        {prev && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              deltaPositive
                ? "bg-[var(--ok)]/10 text-[var(--ok)]"
                : "bg-[var(--danger)]/10 text-[var(--danger)]"
            }`}
          >
            {deltaPositive ? "▲" : "▼"} {pct(netWorth, prevNetWorth)}
          </span>
        )}
      </div>

      {/* Sparkline */}
      <div className="h-10 rounded bg-[var(--ink-3)]/20 mb-3 flex items-end px-1 gap-0.5 overflow-hidden">
        {sparkData.length > 0 ? (
          sparkData.map((v, i) => {
            const h = Math.max(10, Math.round(((v - sparkMin) / sparkRange) * 100));
            return (
              <div
                key={i}
                className="flex-1 rounded-sm bg-[var(--accent)]/50"
                style={{ height: `${h}%` }}
              />
            );
          })
        ) : (
          [40,45,42,50,48,55,52,58,54,60,57,62].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-[var(--ink-3)]/30" style={{ height: `${h}%` }} />
          ))
        )}
      </div>

      <div className="flex gap-4">
        <div>
          <p className="text-[10px] font-mono text-[var(--ink-2)] uppercase tracking-widest">Cash</p>
          <p className="text-sm font-mono tabular text-[var(--ink-1)]">
            {latest?.cash ? fmt(latest.cash) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-mono text-[var(--ink-2)] uppercase tracking-widest">Invested</p>
          <p className="text-sm font-mono tabular text-[var(--ink-1)]">
            {latest?.investments ? fmt(latest.investments) : "—"}
          </p>
        </div>
        {prev && (
          <div>
            <p className="text-[10px] font-mono text-[var(--ink-2)] uppercase tracking-widest">Change</p>
            <p className={`text-sm font-mono tabular ${deltaPositive ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
              {deltaPositive ? "+" : ""}{fmt(delta)}
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
