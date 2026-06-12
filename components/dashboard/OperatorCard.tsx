import { Panel } from "./Panel";

export function OperatorCard() {
  return (
    <Panel label="OPERATOR" labelNum="01" action={
      <span className="text-[10px] font-mono text-[var(--ok)] flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] inline-block animate-pulse" />
        ONLINE
      </span>
    }>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg bg-[var(--border)] flex items-center justify-center text-sm font-mono font-bold text-[var(--ink-1)] shrink-0">
          CM
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--ink-0)] leading-tight">
            Cade <span className="font-light italic">Mourton</span>
          </p>
          <p className="text-[10px] font-mono text-[var(--ink-2)] tracking-widest uppercase mt-0.5">
            Founder · Dallas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-1">FOCUS</p>
          <p className="text-xs italic text-[var(--ink-1)] leading-snug">[Your focus today]</p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-1">STREAK</p>
          <p className="text-xl font-mono tabular text-[var(--ink-0)] leading-none">
            0 <span className="text-[10px] text-[var(--ink-3)] font-normal">DAYS</span>
          </p>
        </div>
      </div>
    </Panel>
  );
}
