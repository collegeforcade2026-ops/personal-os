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
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm flex flex-col ${className}`}
    >
      {(label || action) && (
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-[10px] font-mono tracking-widest text-[var(--ink-2)] uppercase">
            {labelNum && <span className="text-[var(--ink-3)] mr-2">{labelNum} //</span>}
            {label}
          </span>
          {action && <div className="text-[var(--ink-2)]">{action}</div>}
        </div>
      )}
      <div className="flex-1 px-4 pb-4">{children}</div>
    </div>
  );
}
