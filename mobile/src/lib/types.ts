export type TxType = 'expense' | 'income';
export type AccountType = 'cash' | 'bank' | 'card' | 'wallet';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** All money values are stored as integers in minor units (e.g. cents). */
export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
  archived?: boolean;
}

export interface Category {
  id?: number;
  name: string;
  kind: TxType;
  color: string;
  icon: string;
}

export interface Transaction {
  id?: number;
  type: TxType;
  amount: number;
  /** ISO date YYYY-MM-DD */
  date: string;
  categoryId: number;
  accountId: number;
  note: string;
  recurringId?: number;
  createdAt: number;
}

export interface Budget {
  id?: number;
  categoryId: number;
  /** Monthly limit, minor units */
  amount: number;
}

export interface Recurring {
  id?: number;
  type: TxType;
  amount: number;
  categoryId: number;
  accountId: number;
  note: string;
  frequency: Frequency;
  /** Next date a transaction should be created, YYYY-MM-DD */
  nextDate: string;
  /** Optional last date (inclusive) */
  endDate?: string;
  active: boolean;
}

export interface Setting {
  key: string;
  value: string;
}
