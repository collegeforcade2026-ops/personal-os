import { Panel } from "./Panel";
import { getFinanceData } from "@/lib/data/getFinanceData";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pctStr(a: number, b: number) {
  if (!b) return "—";
  const p = ((a - b) / b) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}

export async function FinancePulseCard() {
  const rows = await getFinanceData();
  const latest = rows[rows.length - 1];
  const prev = rows[rows.length - 2];

  const netWorth = latest?.net_worth ?? 0;
  const prevNW = prev?.net_worth ?? netWorth;
  const delta = netWorth - prevNW;
  const isUp = delta >= 0;

  // SVG sparkline
  const sparkVals = rows.slice(-20).map((r) => r.net_worth);
  const sparkMin = Math.min(...sparkVals);
  const sparkMax = Math.max(...sparkVals);
  const sparkRange = sparkMax - sparkMin || 1;
  const W = 260; const H = 40;
  const pts = sparkVals.map((v, i) => {
    const x = (i / (sparkVals.length - 1)) * W;
    const y = H - ((v - sparkMin) / sparkRange) * (H - 4) - 2;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const area = `0,${H} ${polyline} ${W},${H}`;

  return (
    <Panel label="FINANCE PULSE" labelNum="07" action={
      <span className="text-[10px] font-mono text-[var(--ok)] flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] inline-block" />
        LIVE
      </span>
    }>
      <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-1">NET WORTH</p>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-2xl font-mono tabular text-[var(--ink-0)]">
          {netWorth > 0 ? fmt(netWorth) : "$—"}
        </span>
        {prev && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
            isUp ? "bg-[var(--ok)]/10 text-[var(--ok)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"
          }`}>
            {isUp ? "▲" : "▼"} {pctStr(netWorth, prevNW)} · 30D
          </span>
        )}
      </div>

      {/* Green line sparkline */}
      <div className="my-2 overflow-hidden rounded">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-10">
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {sparkVals.length > 1 && (
            <>
              <polygon points={area} fill="url(#spark-fill)" />
              <polyline points={polyline} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-1">
        <div>
          <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">DAILY</p>
          <p className={`text-sm font-mono tabular ${isUp ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
            {isUp ? "+" : ""}{fmt(delta)}
          </p>
          <p className="text-[10px] font-mono text-[var(--ink-3)]">{pctStr(netWorth, prevNW)}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase">MONTHLY</p>
          <p className="text-sm font-mono tabular text-[var(--ink-1)]">
            {latest?.cash ? fmt(latest.cash) : "—"}
          </p>
          <p className="text-[10px] font-mono text-[var(--ink-3)]">CASH</p>
        </div>
      </div>
    </Panel>
  );
}
