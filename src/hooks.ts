import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Account, Category } from './lib/types';
import { formatMoney } from './lib/format';

export function useSetting(key: string, fallback = ''): string {
  return useLiveQuery(() => db.settings.get(key), [key])?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  return db.settings.put({ key, value });
}

export function useCurrency() {
  const currency = useSetting('currency', 'USD');
  return { currency, fmt: (minor: number) => formatMoney(minor, currency) };
}

export function useCategories() {
  const list = useLiveQuery(() => db.categories.orderBy('name').toArray(), []) ?? [];
  const byId = new Map<number, Category>(list.map((c) => [c.id!, c]));
  return { list, byId };
}

export function useAccounts() {
  const list = useLiveQuery(() => db.accounts.orderBy('name').toArray(), []) ?? [];
  const byId = new Map<number, Account>(list.map((a) => [a.id!, a]));
  return { list, byId };
}
