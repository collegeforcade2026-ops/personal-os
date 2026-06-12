import { Panel } from "./Panel";

export function OperatorCard() {
  return (
    <Panel label="OPERATOR" labelNum="01">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-xs font-mono font-bold text-[var(--ink-4)]">
          CM
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--ink-0)]">
            Cade <span className="italic font-light">Mercer</span>
          </p>
          <p className="text-[10px] font-mono text-[var(--ink-2)] tracking-widest uppercase">
            Founder · San Francisco
          </p>
        </div>
        <span className="ml-auto text-[10px] font-mono text-[var(--ok)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] inline-block" />
          ONLINE
        </span>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-mono text-[var(--ink-2)] tracking-widest uppercase mb-1">Focus Today</p>
          <p className="text-sm italic text-[var(--ink-1)]">Ship classifier v2.7 to staging</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono text-[var(--ink-2)] tracking-widest uppercase mb-1">Streak</p>
          <p className="text-lg font-mono tabular text-[var(--ink-0)]">47 <span className="text-xs text-[var(--ink-3)]">d</span></p>
        </div>
      </div>
    </Panel>
  );
}
