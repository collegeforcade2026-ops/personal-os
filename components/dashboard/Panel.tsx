import { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  label?: string;
  labelNum?: string;
  action?: ReactNode;
}

export function Panel({ children, className = "", label, labelNum, action }: PanelProps) {
  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] flex flex-col overflow-hidden ${className}`}>
      {(label || action) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
          <span className="text-[10px] font-mono tracking-[0.15em] text-[var(--ink-2)] uppercase">
            {labelNum && <span className="text-[var(--ink-3)] mr-1.5">{labelNum} //</span>}
            {label}
          </span>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex-1 px-4 py-3">{children}</div>
    </div>
  );
}
