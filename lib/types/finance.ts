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
