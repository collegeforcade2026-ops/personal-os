import { Shell } from "@/components/dashboard/Shell";
import { getBalanceSummary } from "@/lib/data/getBalances";
import { getNetWorthHistory } from "@/lib/data/getNetWorthHistory";
import { getTransactionSummary } from "@/lib/data/getTransactionSummary";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";

export default async function FinancePage() {
  const [summary, history, txnSummary] = await Promise.all([
    getBalanceSummary(),
    getNetWorthHistory(),
    getTransactionSummary(),
  ]);

  return (
    <Shell>
      <FinanceDashboard
        initialSummary={summary}
        history={history}
        txnSummary={txnSummary}
      />
    </Shell>
  );
}
