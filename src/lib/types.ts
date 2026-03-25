import { CurrencyCode } from '@/lib/app-settings';

export type TransactionType = 'income' | 'expense';
export type TransactionSystem = 'weekly-renewal' | 'weekly-rollover' | 'savings-renewal';

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  category: string;
  date: string; // ISO date YYYY-MM-DD
  method: string;
  note?: string;
  weekly?: boolean;
  system?: TransactionSystem;
  createdAt: string; // ISO timestamp
};
