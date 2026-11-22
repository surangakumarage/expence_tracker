import Dexie, { type EntityTable } from 'dexie';
import type { Account, Budget, Category, Recurring, Setting, Transaction } from './lib/types';
import { dueOccurrences } from './lib/recurring';
import { today } from './lib/format';

export const db = new Dexie('expense-tracker') as Dexie & {
  accounts: EntityTable<Account, 'id'>;
  categories: EntityTable<Category, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
  budgets: EntityTable<Budget, 'id'>;
  recurring: EntityTable<Recurring, 'id'>;
  settings: EntityTable<Setting, 'key'>;
};

db.version(1).stores({
  accounts: '++id, name',
  categories: '++id, kind, name',
  transactions: '++id, date, type, categoryId, accountId, recurringId, [type+date]',
  budgets: '++id, &categoryId',
  recurring: '++id, nextDate, active',
  settings: '&key',
});

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food & Dining', kind: 'expense', color: '#f97316', icon: 'utensils' },
  { name: 'Groceries', kind: 'expense', color: '#84cc16', icon: 'shopping-cart' },
  { name: 'Transport', kind: 'expense', color: '#0ea5e9', icon: 'car' },
  { name: 'Housing & Rent', kind: 'expense', color: '#8b5cf6', icon: 'home' },
  { name: 'Utilities & Bills', kind: 'expense', color: '#eab308', icon: 'zap' },
  { name: 'Shopping', kind: 'expense', color: '#ec4899', icon: 'shopping-bag' },
  { name: 'Health', kind: 'expense', color: '#ef4444', icon: 'heart-pulse' },
  { name: 'Entertainment', kind: 'expense', color: '#a855f7', icon: 'film' },
  { name: 'Education', kind: 'expense', color: '#14b8a6', icon: 'graduation-cap' },
  { name: 'Subscriptions', kind: 'expense', color: '#6366f1', icon: 'repeat' },
  { name: 'Other', kind: 'expense', color: '#64748b', icon: 'circle' },
  { name: 'Salary', kind: 'income', color: '#16a34a', icon: 'briefcase' },
  { name: 'Freelance', kind: 'income', color: '#0891b2', icon: 'laptop' },
  { name: 'Gifts', kind: 'income', color: '#d946ef', icon: 'gift' },
  { name: 'Other Income', kind: 'income', color: '#f59e0b', icon: 'plus-circle' },
];

const DEFAULT_ACCOUNTS: Omit<Account, 'id'>[] = [
  { name: 'Cash', type: 'cash', openingBalance: 0, color: '#16a34a' },
  { name: 'Bank Account', type: 'bank', openingBalance: 0, color: '#2563eb' },
];

/** First-run defaults. Safe to call repeatedly. */
export async function ensureSeeded() {
  await db.transaction('rw', db.categories, db.accounts, db.settings, async () => {
    if ((await db.categories.count()) === 0) await db.categories.bulkAdd(DEFAULT_CATEGORIES);
    if ((await db.accounts.count()) === 0) await db.accounts.bulkAdd(DEFAULT_ACCOUNTS);
    if (!(await db.settings.get('currency'))) {
      await db.settings.put({ key: 'currency', value: guessCurrency() });
    }
  });
}

function guessCurrency(): string {
  const region = new Intl.Locale(navigator.language).maximize().region;
  const map: Record<string, string> = {
    US: 'USD', GB: 'GBP', LK: 'LKR', IN: 'INR', AU: 'AUD', CA: 'CAD', JP: 'JPY',
    SG: 'SGD', AE: 'AED', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  };
  return (region && map[region]) || 'USD';
}

/** Create transactions for every recurring rule that is due up to today. Returns count created. */
export async function processRecurring(): Promise<number> {
  const t = today();
  let created = 0;
  await db.transaction('rw', db.recurring, db.transactions, async () => {
    const due = await db.recurring.where('nextDate').belowOrEqual(t).toArray();
    for (const r of due) {
      if (!r.active || r.id == null) continue;
      const { dates, next } = dueOccurrences(r.nextDate, r.frequency, t, r.endDate);
      const now = Date.now();
      await db.transactions.bulkAdd(
        dates.map((date) => ({
          type: r.type,
          amount: r.amount,
          date,
          categoryId: r.categoryId,
          accountId: r.accountId,
          note: r.note,
          recurringId: r.id,
          createdAt: now,
        })),
      );
      created += dates.length;
      const ended = r.endDate != null && next > r.endDate;
      await db.recurring.update(r.id, { nextDate: next, active: !ended });
    }
  });
  return created;
}

// ---------- Backup / restore ----------

export interface Backup {
  app: 'expense-tracker';
  version: 1;
  exportedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurring: Recurring[];
  settings: Setting[];
}

export async function exportBackup(): Promise<Backup> {
  const [accounts, categories, transactions, budgets, recurring, settings] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.budgets.toArray(),
    db.recurring.toArray(),
    db.settings.toArray(),
  ]);
  return {
    app: 'expense-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions,
    budgets,
    recurring,
    // Never export the PIN lock.
    settings: settings.filter((s) => !s.key.startsWith('pin')),
  };
}

export async function importBackup(data: unknown) {
  const b = data as Partial<Backup>;
  if (b?.app !== 'expense-tracker' || !Array.isArray(b.transactions) || !Array.isArray(b.categories)) {
    throw new Error('This file is not an Expense Tracker backup.');
  }
  await db.transaction('rw', [db.accounts, db.categories, db.transactions, db.budgets, db.recurring, db.settings], async () => {
    await Promise.all([db.accounts.clear(), db.categories.clear(), db.transactions.clear(), db.budgets.clear(), db.recurring.clear()]);
    await db.accounts.bulkAdd(b.accounts ?? []);
    await db.categories.bulkAdd(b.categories ?? []);
    await db.transactions.bulkAdd(b.transactions ?? []);
    await db.budgets.bulkAdd(b.budgets ?? []);
    await db.recurring.bulkAdd(b.recurring ?? []);
    for (const s of b.settings ?? []) if (!s.key.startsWith('pin')) await db.settings.put(s);
  });
}

export async function resetAll() {
  await db.delete();
  await db.open();
  await ensureSeeded();
}
