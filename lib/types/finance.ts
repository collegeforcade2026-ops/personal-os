export interface Transaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  account: string;
}

export interface Balance {
  account: string;
  balance: number;
  updated_at: string;
  row: number;
}

export interface BalanceSummary {
  liquid: number;       // Checking + Savings + HYSA + Stables
  invested: number;     // Equities + Index + Crypto + Private
  liabilities: number;  // CC Float + Car Lease + LOC + Tax Accrued
  netWorth: number;
  balances: Balance[];
}

export interface NetWorthSnapshot {
  period: string;       // "2026-04"
  periodLabel: string;  // "Apr 2026"
  netWorth: number;
  liquid: number;
  invested: number;
  liabilities: number;
  delta: number;
}

// Which bucket each account name belongs to
export const LIQUID_ACCOUNTS   = ["Checking", "Savings", "HYSA", "Stables"];
export const INVESTED_ACCOUNTS = ["Equities", "Index", "Crypto", "Private"];
export const LIABILITY_ACCOUNTS = ["CC Float", "Car Lease", "LOC", "Tax Accrued"];

export function accountBucket(name: string): "liquid" | "invested" | "liability" | "unknown" {
  const n = name.toLowerCase();
  if (LIQUID_ACCOUNTS.some(a => n.includes(a.toLowerCase()))) return "liquid";
  if (INVESTED_ACCOUNTS.some(a => n.includes(a.toLowerCase()))) return "invested";
  if (LIABILITY_ACCOUNTS.some(a => n.includes(a.toLowerCase()))) return "liability";
  // Fallback heuristics
  if (n.includes("check") || n.includes("saving") || n.includes("hysa") || n.includes("cash")) return "liquid";
  if (n.includes("equity") || n.includes("stock") || n.includes("etf") || n.includes("crypto") || n.includes("invest") || n.includes("brokerage")) return "invested";
  if (n.includes("loan") || n.includes("debt") || n.includes("credit") || n.includes("lease") || n.includes("tax")) return "liability";
  return "unknown";
}

export function summariseBalances(balances: Balance[]): BalanceSummary {
  let liquid = 0, invested = 0, liabilities = 0;
  for (const b of balances) {
    const bucket = accountBucket(b.account);
    if (bucket === "liquid")    liquid     += b.balance;
    if (bucket === "invested")  invested   += b.balance;
    if (bucket === "liability") liabilities += Math.abs(b.balance);
  }
  return { liquid, invested, liabilities, netWorth: liquid + invested - liabilities, balances };
}
