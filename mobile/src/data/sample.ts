import { getDb, listAccounts, listBudgets, listCategories, notifyChange, setBudget } from './db';
import { monthKey, monthRange, shiftMonth, today } from '../lib/format';
import type { Transaction } from '../lib/types';

/** Adds ~3 months of realistic demo transactions and starter budgets. */
export async function loadSampleData(): Promise<number> {
  const [cats, accs] = await Promise.all([listCategories(), listAccounts()]);
  const cat = (name: string) => cats.find((c) => c.name === name)?.id;
  const cash = accs.find((a) => a.type === 'cash')?.id ?? accs[0]?.id;
  const bank = accs.find((a) => a.type === 'bank')?.id ?? accs[0]?.id;
  if (cash == null || bank == null) throw new Error('Create an account first.');

  const t = today();
  const rand = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 100);
  const txs: Omit<Transaction, 'id'>[] = [];
  const add = (date: string, type: Transaction['type'], category: string, amount: number, note: string, accountId = bank) => {
    const categoryId = cat(category);
    if (categoryId == null || date > t) return;
    txs.push({ type, amount, date, categoryId, accountId, note, createdAt: Date.now() });
  };

  for (let i = -2; i <= 0; i++) {
    const m = shiftMonth(monthKey(new Date()), i);
    const lastDay = Number(monthRange(m).end.slice(8));
    const d = (day: number) => `${m}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
    add(d(1), 'income', 'Salary', 350000, 'Monthly salary');
    add(d(3), 'expense', 'Housing & Rent', 85000, 'Rent');
    add(d(5), 'expense', 'Utilities & Bills', rand(80, 140), 'Electricity');
    add(d(6), 'expense', 'Utilities & Bills', 4500, 'Internet');
    add(d(8), 'expense', 'Subscriptions', 1599, 'Netflix');
    add(d(8), 'expense', 'Subscriptions', 1099, 'Spotify');
    add(d(10), 'income', 'Freelance', rand(300, 900), 'Website project');
    for (let w = 0; w < 4; w++) {
      add(d(2 + w * 7), 'expense', 'Groceries', rand(60, 140), 'Supermarket');
      add(d(4 + w * 7), 'expense', 'Transport', rand(10, 40), 'Fuel', cash);
      add(d(5 + w * 7), 'expense', 'Food & Dining', rand(8, 35), 'Lunch', cash);
      add(d(6 + w * 7), 'expense', 'Food & Dining', rand(20, 70), 'Dinner out');
    }
    add(d(12), 'expense', 'Shopping', rand(40, 220), 'Clothes');
    add(d(15), 'expense', 'Entertainment', rand(15, 60), 'Movies');
    add(d(20), 'expense', 'Health', rand(20, 90), 'Pharmacy', cash);
    add(d(24), 'expense', 'Education', rand(30, 120), 'Online course');
  }

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const x of txs) {
      await db.runAsync(
        'INSERT INTO transactions (type, amount, date, categoryId, accountId, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        x.type, x.amount, x.date, x.categoryId, x.accountId, x.note, x.createdAt,
      );
    }
  });

  if ((await listBudgets()).length === 0) {
    const plan: [string, number][] = [['Food & Dining', 40000], ['Groceries', 45000], ['Transport', 12000], ['Shopping', 15000], ['Entertainment', 5000]];
    for (const [n, amount] of plan) {
      const id = cat(n);
      if (id != null) await setBudget(id, amount);
    }
  }
  notifyChange();
  return txs.length;
}
