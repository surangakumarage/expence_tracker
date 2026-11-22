import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Plus, Receipt, Scale, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../db';
import { useAccounts, useCategories, useCurrency } from '../hooks';
import { monthKey, monthLabel, monthRange, shiftMonth } from '../lib/format';
import { accountBalances, budgetStatus, byCategory, totals } from '../lib/stats';
import type { Transaction, TxType } from '../lib/types';
import { MonthPicker } from '../components/MonthPicker';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState, PageHeader, ProgressBar, Segmented } from '../components/ui';
import type { Page } from '../App';

export function Dashboard({ onAdd, onEdit, go }: { onAdd: () => void; onEdit: (t: Transaction) => void; go: (p: Page) => void }) {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [breakdown, setBreakdown] = useState<TxType>('expense');
  const { fmt } = useCurrency();
  const { byId: cats } = useCategories();
  const { list: accounts, byId: accs } = useAccounts();

  const { start, end } = monthRange(month);
  const trendStart = monthRange(shiftMonth(month, -5)).start;

  const all = useLiveQuery(() => db.transactions.toArray(), []);
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];

  const data = useMemo(() => {
    const txs = all ?? [];
    const monthTxs = txs.filter((t) => t.date >= start && t.date <= end);
    const trendTxs = txs.filter((t) => t.date >= trendStart && t.date <= end);
    const trend = Array.from({ length: 6 }, (_, i) => {
      const m = shiftMonth(month, i - 5);
      const tt = totals(trendTxs.filter((t) => t.date.startsWith(m)));
      return { month: monthLabel(m, 'short'), Income: tt.income / 100, Expense: tt.expense / 100 };
    });
    const balances = accountBalances(accounts, txs);
    const netWorth = [...balances.entries()]
      .filter(([id]) => !accs.get(id)?.archived)
      .reduce((s, [, v]) => s + v, 0);
    return {
      monthTxs,
      t: totals(monthTxs),
      byCat: { expense: byCategory(monthTxs, 'expense'), income: byCategory(monthTxs, 'income') },
      trend,
      netWorth,
      budgets: budgetStatus(budgets, monthTxs),
      recent: [...monthTxs].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)).slice(0, 6),
    };
  }, [all, start, end, trendStart, month, accounts, accs, budgets]);

  if (!all) return null;

  const alerts = data.budgets.filter((b) => b.ratio >= 0.8);
  const pie = data.byCat[breakdown];
  const pieTotal = breakdown === 'income' ? data.t.income : data.t.expense;
  const savingsRate = data.t.income > 0 ? Math.round((data.t.net / data.t.income) * 100) : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Overview for ${monthLabel(month)}`}
        actions={
          <>
            <MonthPicker value={month} onChange={setMonth} />
            <button className="btn-primary" onClick={onAdd}>
              <Plus size={16} /> Add
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Income" value={fmt(data.t.income)} icon={<ArrowUpRight size={18} />} tone="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" />
        <StatCard label="Expenses" value={fmt(data.t.expense)} icon={<ArrowDownRight size={18} />} tone="text-red-600 bg-red-50 dark:bg-red-950/40" />
        <StatCard
          label="Net savings"
          value={fmt(data.t.net)}
          hint={savingsRate != null ? `${savingsRate}% of income` : undefined}
          icon={<Scale size={18} />}
          tone="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40"
        />
        <StatCard label="Total balance" value={fmt(data.netWorth)} hint="All accounts" icon={<Wallet size={18} />} tone="text-sky-600 bg-sky-50 dark:bg-sky-950/40" />
      </div>

      {alerts.length > 0 && (
        <div className="mt-4 space-y-2">
          {alerts.map((a) => {
            const c = cats.get(a.budget.categoryId);
            const over = a.ratio >= 1;
            return (
              <div
                key={a.budget.id}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  over ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                <AlertTriangle size={16} />
                {over
                  ? `${c?.name}: over budget by ${fmt(-a.remaining)}`
                  : `${c?.name}: ${Math.round(a.ratio * 100)}% of budget used, ${fmt(a.remaining)} left`}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="card lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{breakdown === 'income' ? 'Income' : 'Spending'} by category</h2>
            <Segmented
              value={breakdown}
              onChange={setBreakdown}
              options={[
                { value: 'expense', label: 'Expenses' },
                { value: 'income', label: 'Income' },
              ]}
            />
          </div>
          {pie.length === 0 ? (
            <EmptyState icon={<Receipt size={36} />} title={breakdown === 'income' ? 'No income this month' : 'No expenses this month'} />
          ) : (
            <>
              <div className="relative h-56">
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
                  <span className={`text-sm font-bold tabular-nums ${breakdown === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(pieTotal)}</span>
                </div>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pie} dataKey="amount" nameKey="categoryId" innerRadius="55%" outerRadius="90%" paddingAngle={2}>
                      {pie.map((p) => (
                        <Cell key={p.categoryId} fill={cats.get(p.categoryId)?.color ?? '#94a3b8'} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, _n, item) => [fmt(Number(v)), cats.get(item.payload.categoryId)?.name ?? '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {pie.slice(0, 6).map((p) => {
                  const c = cats.get(p.categoryId);
                  return (
                    <li key={p.categoryId} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c?.color }} />
                      <span className="flex-1 truncate">{c?.name}</span>
                      <span className="text-slate-500">{Math.round((p.amount / pieTotal) * 100)}%</span>
                      <span className="w-24 text-right font-medium tabular-nums">{fmt(p.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="card lg:col-span-3">
          <h2 className="mb-2 font-semibold">Last 6 months</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data.trend} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={56} tickFormatter={compact} />
                <Tooltip formatter={(v) => fmt(Math.round(Number(v) * 100))} cursor={{ fill: '#94a3b822' }} />
                <Legend iconType="circle" />
                <Bar dataKey="Income" fill="#16a34a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Budgets</h2>
            <button className="btn-ghost text-sm" onClick={() => go('budgets')}>Manage</button>
          </div>
          {data.budgets.length === 0 ? (
            <EmptyState
              icon={<Scale size={36} />}
              title="No budgets yet"
              hint="Set monthly limits per category to get alerts before you overspend."
              action={<button className="btn-secondary" onClick={() => go('budgets')}>Set budgets</button>}
            />
          ) : (
            <ul className="space-y-3">
              {data.budgets.slice(0, 5).map((b) => (
                <li key={b.budget.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{cats.get(b.budget.categoryId)?.name}</span>
                    <span className="tabular-nums text-slate-500">
                      {fmt(b.spent)} / {fmt(b.budget.amount)}
                    </span>
                  </div>
                  <ProgressBar value={b.ratio} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Recent transactions</h2>
            <button className="btn-ghost text-sm" onClick={() => go('transactions')}>View all</button>
          </div>
          {data.recent.length === 0 ? (
            <EmptyState
              icon={<Receipt size={36} />}
              title="Nothing recorded this month"
              action={<button className="btn-primary" onClick={onAdd}><Plus size={16} /> Add transaction</button>}
            />
          ) : (
            <div className="-mx-2">
              {data.recent.map((t) => (
                <TransactionRow key={t.id} tx={t} category={cats.get(t.categoryId)} account={accs.get(t.accountId)} fmt={fmt} onClick={() => onEdit(t)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function compact(v: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

function StatCard({ label, value, hint, icon, tone }: { label: string; value: string; hint?: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`rounded-lg p-1.5 ${tone}`}>{icon}</span>
      </div>
      <div className="mt-2 truncate text-xl font-bold tabular-nums sm:text-2xl">{value}</div>
      {hint && <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
}
