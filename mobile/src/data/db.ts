import * as SQLite from 'expo-sqlite';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Account, Budget, Category, Recurring, Setting, Transaction } from '../lib/types';
import { dueOccurrences } from '../lib/recurring';
import { today } from '../lib/format';

// ---------- Connection & migrations ----------

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('expense-tracker.db');
  return dbPromise;
}

const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL,
    openingBalance INTEGER NOT NULL DEFAULT 0, color TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL,
    color TEXT NOT NULL, icon TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, amount INTEGER NOT NULL, date TEXT NOT NULL,
    categoryId INTEGER NOT NULL, accountId INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '',
    recurringId INTEGER, createdAt INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(categoryId);
  CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(accountId);
  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT, categoryId INTEGER NOT NULL UNIQUE, amount INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recurring (
    id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, amount INTEGER NOT NULL,
    categoryId INTEGER NOT NULL, accountId INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '',
    frequency TEXT NOT NULL, nextDate TEXT NOT NULL, endDate TEXT, active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  `,
];

async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version === 0) await db.execAsync('PRAGMA journal_mode = WAL;');
  while (version < MIGRATIONS.length) {
    await db.execAsync(MIGRATIONS[version]);
    version++;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}

// ---------- Change notification (drives useQuery re-renders) ----------

let version = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function notifyChange() {
  version++;
  listeners.forEach((l) => l());
}

/** Runs an async query and re-runs it after any write. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const v = useSyncExternalStore(subscribe, () => version, () => version);
  const [data, setData] = useState<T>();
  useEffect(() => {
    let alive = true;
    fn().then((d) => alive && setData(d), console.error);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, ...deps]);
  return data;
}

// ---------- Row mapping ----------

type Row = Record<string, unknown>;
const toAccount = (r: Row): Account => ({ ...(r as unknown as Account), archived: !!r.archived });
const toTx = (r: Row): Transaction => ({ ...(r as unknown as Transaction), recurringId: (r.recurringId as number | null) ?? undefined });
const toRecurring = (r: Row): Recurring => ({
  ...(r as unknown as Recurring),
  active: !!r.active,
  endDate: (r.endDate as string | null) ?? undefined,
});

type SQLValue = string | number | null;
const sqlValue = (v: unknown): SQLValue => (v === undefined || v === null ? null : typeof v === 'boolean' ? (v ? 1 : 0) : (v as SQLValue));

async function insert(table: string, obj: Record<string, unknown>, db?: SQLite.SQLiteDatabase): Promise<number> {
  const d = db ?? (await getDb());
  const keys = Object.keys(obj).filter((k) => k !== 'id' || obj.id != null);
  const res = await d.runAsync(
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
    keys.map((k) => sqlValue(obj[k])),
  );
  return res.lastInsertRowId;
}

async function update(table: string, id: number, obj: Record<string, unknown>) {
  const d = await getDb();
  const keys = Object.keys(obj).filter((k) => k !== 'id');
  await d.runAsync(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => sqlValue(obj[k])), id]);
}

async function remove(table: string, id: number) {
  const d = await getDb();
  await d.runAsync(`DELETE FROM ${table} WHERE id = ?`, id);
}

// ---------- Seeding ----------

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

async function seed(db: SQLite.SQLiteDatabase) {
  const cats = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
  if (!cats?.n) for (const c of DEFAULT_CATEGORIES) await insert('categories', c, db);
  const accs = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM accounts');
  if (!accs?.n) for (const a of DEFAULT_ACCOUNTS) await insert('accounts', a, db);
  const cur = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', 'currency');
  if (!cur) await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', 'currency', guessCurrency());
}

function guessCurrency(): string {
  try {
    const region = new Intl.Locale(Intl.DateTimeFormat().resolvedOptions().locale).maximize().region;
    const map: Record<string, string> = {
      US: 'USD', GB: 'GBP', LK: 'LKR', IN: 'INR', AU: 'AUD', CA: 'CAD', JP: 'JPY',
      SG: 'SGD', AE: 'AED', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
    };
    return (region && map[region]) || 'USD';
  } catch {
    return 'USD';
  }
}

export async function initDb() {
  const db = await getDb();
  await migrate(db);
  await seed(db);
  await processRecurring();
}

// ---------- Settings ----------

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await (await getDb()).getAllAsync<Setting>('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(key: string, value: string) {
  await (await getDb()).runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
  notifyChange();
}

export async function deleteSettings(keys: string[]) {
  const db = await getDb();
  for (const k of keys) await db.runAsync('DELETE FROM settings WHERE key = ?', k);
  notifyChange();
}

// ---------- Categories ----------

export async function listCategories(): Promise<Category[]> {
  return (await getDb()).getAllAsync<Category>('SELECT * FROM categories ORDER BY name COLLATE NOCASE');
}

export async function saveCategory(data: Omit<Category, 'id'>, id?: number) {
  if (id != null) await update('categories', id, data);
  else await insert('categories', data);
  notifyChange();
}

/** Returns an error message if the category is still in use. */
export async function deleteCategory(id: number): Promise<string | null> {
  const db = await getDb();
  const tx = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions WHERE categoryId = ?', id);
  const rec = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM recurring WHERE categoryId = ?', id);
  if ((tx?.n ?? 0) + (rec?.n ?? 0) > 0) {
    return `Used by ${tx?.n ?? 0} transaction(s) and ${rec?.n ?? 0} recurring rule(s). Reassign them first.`;
  }
  await db.runAsync('DELETE FROM budgets WHERE categoryId = ?', id);
  await remove('categories', id);
  notifyChange();
  return null;
}

// ---------- Accounts ----------

export async function listAccounts(): Promise<Account[]> {
  const rows = await (await getDb()).getAllAsync<Row>('SELECT * FROM accounts ORDER BY name COLLATE NOCASE');
  return rows.map(toAccount);
}

export async function saveAccount(data: Omit<Account, 'id'>, id?: number) {
  if (id != null) await update('accounts', id, data);
  else await insert('accounts', data);
  notifyChange();
}

export async function deleteAccount(id: number): Promise<string | null> {
  const db = await getDb();
  const tx = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions WHERE accountId = ?', id);
  if (tx?.n) return `This account has ${tx.n} transactions. Archive it instead.`;
  await remove('accounts', id);
  notifyChange();
  return null;
}

// ---------- Transactions ----------

export async function listTransactions(range?: { start: string; end: string }): Promise<Transaction[]> {
  const db = await getDb();
  const rows = range
    ? await db.getAllAsync<Row>('SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC, createdAt DESC', range.start, range.end)
    : await db.getAllAsync<Row>('SELECT * FROM transactions ORDER BY date DESC, createdAt DESC');
  return rows.map(toTx);
}

export async function getTransaction(id: number): Promise<Transaction | null> {
  const r = await (await getDb()).getFirstAsync<Row>('SELECT * FROM transactions WHERE id = ?', id);
  return r ? toTx(r) : null;
}

export async function saveTransaction(data: Omit<Transaction, 'id' | 'createdAt'> & { createdAt?: number }, id?: number) {
  if (id != null) await update('transactions', id, data);
  else await insert('transactions', { ...data, createdAt: data.createdAt ?? Date.now() });
  notifyChange();
}

export async function deleteTransaction(id: number) {
  await remove('transactions', id);
  notifyChange();
}

// ---------- Budgets ----------

export async function listBudgets(): Promise<Budget[]> {
  return (await getDb()).getAllAsync<Budget>('SELECT * FROM budgets');
}

/** amount null removes the budget. */
export async function setBudget(categoryId: number, amount: number | null) {
  const db = await getDb();
  if (amount == null) await db.runAsync('DELETE FROM budgets WHERE categoryId = ?', categoryId);
  else await db.runAsync('INSERT INTO budgets (categoryId, amount) VALUES (?, ?) ON CONFLICT(categoryId) DO UPDATE SET amount = excluded.amount', categoryId, amount);
  notifyChange();
}

// ---------- Recurring ----------

export async function listRecurring(): Promise<Recurring[]> {
  const rows = await (await getDb()).getAllAsync<Row>('SELECT * FROM recurring ORDER BY active DESC, nextDate');
  return rows.map(toRecurring);
}

export async function getRecurring(id: number): Promise<Recurring | null> {
  const r = await (await getDb()).getFirstAsync<Row>('SELECT * FROM recurring WHERE id = ?', id);
  return r ? toRecurring(r) : null;
}

export async function saveRecurring(data: Omit<Recurring, 'id'>, id?: number): Promise<number> {
  let rid = id;
  if (id != null) await update('recurring', id, data);
  else rid = await insert('recurring', data);
  notifyChange();
  return rid!;
}

export async function deleteRecurring(id: number) {
  await remove('recurring', id);
  notifyChange();
}

/** Creates transactions for every active rule due up to today. Returns how many were created. */
export async function processRecurring(): Promise<number> {
  const db = await getDb();
  const t = today();
  let created = 0;
  const due = (await db.getAllAsync<Row>('SELECT * FROM recurring WHERE active = 1 AND nextDate <= ?', t)).map(toRecurring);
  if (due.length === 0) return 0;
  await db.withTransactionAsync(async () => {
    for (const r of due) {
      const { dates, next } = dueOccurrences(r.nextDate, r.frequency, t, r.endDate);
      const now = Date.now();
      for (const date of dates) {
        await insert('transactions', {
          type: r.type, amount: r.amount, date, categoryId: r.categoryId, accountId: r.accountId,
          note: r.note, recurringId: r.id, createdAt: now,
        }, db);
      }
      created += dates.length;
      const ended = r.endDate != null && next > r.endDate;
      await db.runAsync('UPDATE recurring SET nextDate = ?, active = ? WHERE id = ?', next, ended ? 0 : 1, r.id!);
    }
  });
  notifyChange();
  return created;
}

// ---------- Backup / restore (same JSON format as the web app) ----------

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
    listAccounts(), listCategories(), listTransactions(), listBudgets(), listRecurring(),
    getDb().then((d) => d.getAllAsync<Setting>('SELECT key, value FROM settings')),
  ]);
  return {
    app: 'expense-tracker', version: 1, exportedAt: new Date().toISOString(),
    accounts, categories, transactions, budgets, recurring,
    settings: settings.filter((s) => !s.key.startsWith('pin')),
  };
}

const TABLES = ['transactions', 'budgets', 'recurring', 'accounts', 'categories'] as const;

export async function importBackup(data: unknown) {
  const b = data as Partial<Backup>;
  if (b?.app !== 'expense-tracker' || !Array.isArray(b.transactions) || !Array.isArray(b.categories)) {
    throw new Error('This file is not an Expense Tracker backup.');
  }
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of TABLES) await db.runAsync(`DELETE FROM ${t}`);
    for (const a of b.accounts ?? []) await insert('accounts', a as unknown as Row, db);
    for (const c of b.categories ?? []) await insert('categories', c as unknown as Row, db);
    for (const t of b.transactions ?? []) await insert('transactions', t as unknown as Row, db);
    for (const x of b.budgets ?? []) await insert('budgets', x as unknown as Row, db);
    for (const r of b.recurring ?? []) await insert('recurring', r as unknown as Row, db);
    for (const s of b.settings ?? []) {
      if (!s.key.startsWith('pin')) await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', s.key, s.value);
    }
  });
  notifyChange();
}

export async function resetAll() {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of [...TABLES, 'settings']) await db.runAsync(`DELETE FROM ${t}`);
    await db.runAsync("DELETE FROM sqlite_sequence");
  });
  await seed(db);
  notifyChange();
}
