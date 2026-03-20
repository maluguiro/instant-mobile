export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  category: string;
  date: string; // ISO date YYYY-MM-DD
  method: string;
  note?: string;
  createdAt: string; // ISO timestamp
};
import { CurrencyCode } from '@/lib/app-settings';
