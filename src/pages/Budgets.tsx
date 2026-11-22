import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, PiggyBank, Trash2 } from 'lucide-react';
import { db } from '../db';
import { useCategories, useCurrency } from '../hooks';
import { monthKey, monthLabel, monthRange, parseAmount, toInputAmount } from '../lib/format';
import { budgetStatus, byCategory } from '../lib/stats';
import { CategoryIcon } from '../components/CategoryIcon';
import { MonthPicker } from '../components/MonthPicker';
import { PageHeader, ProgressBar } from '../components/ui';

export function Budgets() {
  const [month, setMonth] = useState(monthKey(new Date()));
  const { fmt } = useCurrency();
  const { list: categories } = useCategories();
  const { start, end } = monthRange(month);

  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];
  const monthTxs = useLiveQuery(() => db.transactions.where('date').between(start, end, true, true).toArray(), [start, end]) ?? [];

  const status = useMemo(() => new Map(budgetStatus(budgets, monthTxs).map((s) => [s.budget.categoryId, s])), [budgets, monthTxs]);
  const spent = useMemo(() => new Map(byCategory(monthTxs, 'expense').map((c) => [c.categoryId, c.amount])), [monthTxs]);

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpentInBudgeted = budgets.reduce((s, b) => s + (spent.get(b.categoryId) ?? 0), 0);
  const expenseCats = categories.filter((c) => c.kind === 'expense');

  return (
    <div>
      <PageHeader title="Budgets" subtitle="Monthly spending limits per category" actions={<MonthPicker value={month} onChange={setMonth} />} />

      <div className="card mb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total budgeted · {monthLabel(month)}</div>
            <div className="text-2xl font-bold tabular-nums">{fmt(totalSpentInBudgeted)} <span className="text-base font-normal text-slate-500">of {fmt(totalBudget)}</span></div>
          </div>
          {totalBudget > 0 && (
            <div className={`text-sm font-medium ${totalBudget - totalSpentInBudgeted < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {totalBudget - totalSpentInBudgeted < 0
                ? `${fmt(totalSpentInBudgeted - totalBudget)} over`
                : `${fmt(totalBudget - totalSpentInBudgeted)} left`}
            </div>
          )}
        </div>
        {totalBudget > 0 && <div className="mt-3"><ProgressBar value={totalSpentInBudgeted / totalBudget} /></div>}
        {totalBudget === 0 && (
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><PiggyBank size={16} /> Enter a limit next to any category below to start budgeting.</p>
        )}
      </div>

      <div className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
        {expenseCats.map((c) => (
          <BudgetRow
            key={c.id}
            categoryId={c.id!}
            name={c.name}
            icon={<CategoryIcon icon={c.icon} color={c.color} />}
            budgetId={status.get(c.id!)?.budget.id}
            limit={status.get(c.id!)?.budget.amount}
            spent={spent.get(c.id!) ?? 0}
            fmt={fmt}
          />
        ))}
      </div>
    </div>
  );
}

function BudgetRow({
  categoryId, name, icon, budgetId, limit, spent, fmt,
}: {
  categoryId: number; name: string; icon: React.ReactNode; budgetId?: number; limit?: number; spent: number; fmt: (n: number) => string;
}) {
  const [value, setValue] = useState(limit != null ? toInputAmount(limit) : '');
  const [lastLimit, setLastLimit] = useState(limit);
  // Keep the input in sync when the stored limit changes elsewhere.
  if (limit !== lastLimit) {
    setLastLimit(limit);
    setValue(limit != null ? toInputAmount(limit) : '');
  }

  const parsed = value.trim() === '' ? null : parseAmount(value);
  const invalid = parsed != null && (!Number.isFinite(parsed) || parsed <= 0);
  const dirty = (parsed ?? undefined) !== limit && !invalid;

  async function save() {
    if (invalid) return;
    if (parsed == null) {
      if (budgetId != null) await db.budgets.delete(budgetId);
    } else if (budgetId != null) {
      await db.budgets.update(budgetId, { amount: parsed });
    } else {
      await db.budgets.add({ categoryId, amount: parsed });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      {icon}
      <div className="min-w-0 flex-1 basis-40">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{name}</span>
          <span className="tabular-nums text-slate-500">
            {fmt(spent)}{limit != null && ` / ${fmt(limit)}`}
          </span>
        </div>
        {limit != null ? (
          <div className="mt-1.5"><ProgressBar value={spent / limit} /></div>
        ) : (
          <div className="mt-1 text-xs text-slate-400">No budget</div>
        )}
      </div>
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          className={`input w-28 text-right ${invalid ? 'border-red-500' : ''}`}
          inputMode="decimal"
          placeholder="Limit"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => dirty && save()}
          aria-label={`${name} monthly budget`}
        />
        {dirty && <button className="btn-ghost text-emerald-600" type="submit" aria-label="Save"><Check size={16} /></button>}
        {budgetId != null && !dirty && (
          <button className="btn-ghost text-slate-400 hover:text-red-600" type="button" aria-label="Remove budget" onClick={() => db.budgets.delete(budgetId)}>
            <Trash2 size={16} />
          </button>
        )}
      </form>
    </div>
  );
}
