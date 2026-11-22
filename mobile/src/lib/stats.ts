import type { Account, Budget, Transaction } from './types';

export function totals(txs: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

/** Sum of amounts per category for one transaction type, sorted descending. */
export function byCategory(txs: Transaction[], type: Transaction['type']) {
  const map = new Map<number, number>();
  for (const t of txs) if (t.type === type) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  return [...map.entries()].map(([categoryId, amount]) => ({ categoryId, amount })).sort((a, b) => b.amount - a.amount);
}

export function accountBalances(accounts: Account[], txs: Transaction[]) {
  const bal = new Map<number, number>(accounts.map((a) => [a.id!, a.openingBalance]));
  for (const t of txs) {
    if (!bal.has(t.accountId)) continue;
    bal.set(t.accountId, bal.get(t.accountId)! + (t.type === 'income' ? t.amount : -t.amount));
  }
  return bal;
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  ratio: number;
  remaining: number;
}

export function budgetStatus(budgets: Budget[], monthTxs: Transaction[]): BudgetStatus[] {
  const spent = new Map(byCategory(monthTxs, 'expense').map((c) => [c.categoryId, c.amount]));
  return budgets
    .map((b) => {
      const s = spent.get(b.categoryId) ?? 0;
      return { budget: b, spent: s, ratio: b.amount > 0 ? s / b.amount : 0, remaining: b.amount - s };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/** Group transactions by date (desc), each group with its net total. */
export function groupByDate(txs: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const t of txs) {
    const g = groups.get(t.date);
    if (g) g.push(t);
    else groups.set(t.date, [t]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => b.createdAt - a.createdAt),
      net: totals(items).net,
    }));
}
