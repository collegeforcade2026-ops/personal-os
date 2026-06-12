import { Shell } from "@/components/dashboard/Shell";
import { UploadZone } from "@/components/finance/UploadZone";
import { BalancesWidget } from "@/components/finance/BalancesWidget";
import { SnapshotHistory } from "@/components/finance/SnapshotHistory";

export default function FinancePage() {
  return (
    <Shell>
      <div className="text-[var(--ink-0)] p-4 max-w-5xl mx-auto">
        <div className="mb-5 border-b border-[var(--border)] pb-4">
          <p className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-0.5">Finance</p>
          <h1 className="text-lg font-mono text-[var(--ink-0)] tracking-tight">Net Worth · Overview</h1>
        </div>

        {/* Balances — full width */}
        <div className="mb-6">
          <BalancesWidget />
        </div>

        {/* Snapshot history — full width */}
        <div className="mb-6">
          <SnapshotHistory />
        </div>

        {/* Statement uploader + summary */}
        <div className="grid grid-cols-[1fr_300px] gap-6">
          <UploadZone />
        </div>
      </div>
    </Shell>
  );
}
