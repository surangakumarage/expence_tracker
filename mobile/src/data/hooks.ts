import { useMemo } from 'react';
import { listAccounts, listCategories, useQuery } from './db';
import type { Account, Category } from '../lib/types';

export function useCategories() {
  const list = useQuery(listCategories);
  return useMemo(() => ({ list: list ?? [], byId: new Map<number, Category>((list ?? []).map((c) => [c.id!, c])) }), [list]);
}

export function useAccounts() {
  const list = useQuery(listAccounts);
  return useMemo(() => ({ list: list ?? [], byId: new Map<number, Account>((list ?? []).map((a) => [a.id!, a])) }), [list]);
}
