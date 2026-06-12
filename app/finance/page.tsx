import { Shell } from "@/components/dashboard/Shell";
import { UploadZone } from "@/components/finance/UploadZone";

export default function FinancePage() {
  return (
    <Shell>
      <div className="text-[var(--ink-0)] p-4">
        <div className="mb-5 border-b border-[var(--border)] pb-4">
          <p className="text-[10px] font-mono text-[var(--ink-3)] tracking-widest uppercase mb-0.5">Upload Statement</p>
          <h1 className="text-lg font-mono text-[var(--ink-0)] tracking-tight">Bank Statement Importer</h1>
        </div>
        <UploadZone />
      </div>
    </Shell>
  );
}
