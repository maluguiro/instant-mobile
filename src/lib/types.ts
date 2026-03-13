export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // ISO date YYYY-MM-DD
  method: string;
  createdAt: string; // ISO timestamp
};
