import { describe, expect, it } from 'vitest';
import { monthRange, parseAmount, shiftMonth, toInputAmount } from './format';
import { advanceDate, dueOccurrences } from './recurring';
import { csvEscape, toCSV } from './csv';
import { accountBalances, budgetStatus, byCategory, groupByDate, totals } from './stats';
import type { Transaction } from './types';

describe('parseAmount', () => {
  it('parses to minor units without float error', () => {
    expect(parseAmount('12.34')).toBe(1234);
    expect(parseAmount('0.1')).toBe(10);
    expect(parseAmount('1,234.5')).toBe(123450);
    expect(parseAmount('19.99')).toBe(1999);
    expect(parseAmount('5')).toBe(500);
  });
  it('rejects invalid input', () => {
    for (const s of ['', 'abc', '1.234', '-5', '1.2.3']) expect(parseAmount(s)).toBeNaN();
  });
  it('round-trips', () => expect(toInputAmount(parseAmount('42.07'))).toBe('42.07'));
});

describe('months', () => {
  it('shifts across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
  it('knows month lengths', () => {
    expect(monthRange('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
    expect(monthRange('2026-04').end).toBe('2026-04-30');
  });
});

describe('recurring', () => {
  it('advances simple periods', () => {
    expect(advanceDate('2026-11-30', 'daily')).toBe('2026-12-01');
    expect(advanceDate('2026-12-28', 'weekly')).toBe('2027-01-04');
    expect(advanceDate('2024-02-29', 'yearly')).toBe('2025-02-28');
  });
  it('keeps month-end anchor', () => {
    const { dates, next } = dueOccurrences('2026-01-31', 'monthly', '2026-04-30');
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    expect(next).toBe('2026-05-31');
  });
  it('respects end date and nothing-due', () => {
    expect(dueOccurrences('2026-01-01', 'weekly', '2026-12-31', '2026-01-15').dates).toHaveLength(3);
    expect(dueOccurrences('2026-12-01', 'monthly', '2026-11-16').dates).toEqual([]);
  });
});

describe('csv', () => {
  it('quotes and guards formulas', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvEscape('-12.50')).toBe('-12.50');
    expect(toCSV(['A', 'B'], [[1, null]])).toBe('A,B\r\n1,');
  });
});

const tx = (p: Partial<Transaction>): Transaction => ({
  type: 'expense', amount: 100, date: '2026-11-01', categoryId: 1, accountId: 1, note: '', createdAt: 0, ...p,
});

describe('stats', () => {
  const txs = [
    tx({ amount: 1000, categoryId: 1 }),
    tx({ amount: 500, categoryId: 2, date: '2026-11-02' }),
    tx({ amount: 300, categoryId: 1, accountId: 2 }),
    tx({ type: 'income', amount: 5000, categoryId: 9, date: '2026-11-02' }),
  ];
  it('totals', () => expect(totals(txs)).toEqual({ income: 5000, expense: 1800, net: 3200 }));
  it('groups by category', () =>
    expect(byCategory(txs, 'expense')).toEqual([{ categoryId: 1, amount: 1300 }, { categoryId: 2, amount: 500 }]));
  it('computes balances', () => {
    const b = accountBalances([{ id: 1, name: 'A', type: 'cash', openingBalance: 100, color: '' }, { id: 2, name: 'B', type: 'bank', openingBalance: 0, color: '' }], txs);
    expect(b.get(1)).toBe(100 - 1000 - 500 + 5000);
    expect(b.get(2)).toBe(-300);
  });
  it('budget status sorted by usage', () => {
    const s = budgetStatus([{ id: 1, categoryId: 2, amount: 1000 }, { id: 2, categoryId: 1, amount: 1000 }], txs);
    expect(s.map((x) => [x.budget.categoryId, x.ratio])).toEqual([[1, 1.3], [2, 0.5]]);
    expect(s[0].remaining).toBe(-300);
  });
  it('groups by date desc', () => {
    const g = groupByDate(txs);
    expect(g.map((x) => x.date)).toEqual(['2026-11-02', '2026-11-01']);
    expect(g[0].net).toBe(4500);
  });
});
