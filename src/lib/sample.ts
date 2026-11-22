import { db } from '../db';
import { shiftMonth, monthKey, monthRange, today } from './format';
import type { Transaction } from './types';

/** Adds ~3 months of realistic demo transactions. */
export async function loadSampleData() {
  const cats = await db.categories.toArray();
  const accs = await db.accounts.toArray();
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
    const { end } = monthRange(m);
    const lastDay = Number(end.slice(8));
    const d = (day: number) => `${m}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;

    add(d(1), 'income', 'Salary', 350000, 'Monthly salary');
    add(d(3), 'expense', 'Housing & Rent', 85000, 'Rent');
    add(d(5), 'expense', 'Utilities & Bills', rand(80, 140), 'Electricity');
    add(d(6), 'expense', 'Utilities & Bills', 4500, 'Internet');
    add(d(8), 'expense', 'Subscriptions', 1599, 'Netflix');
    add(d(8), 'expense', 'Subscriptions', 1099, 'Spotify');
    if (i !== -1) add(d(18), 'income', 'Freelance', rand(300, 900), 'Website project');
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
  await db.transactions.bulkAdd(txs);

  if ((await db.budgets.count()) === 0) {
    const plan: [string, number][] = [['Food & Dining', 40000], ['Groceries', 45000], ['Transport', 12000], ['Shopping', 15000], ['Entertainment', 5000]];
    await db.budgets.bulkAdd(plan.flatMap(([n, amount]) => (cat(n) != null ? [{ categoryId: cat(n)!, amount }] : [])));
  }
  return txs.length;
}
