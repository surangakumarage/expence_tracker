import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Plus, Receipt, Search, X } from 'lucide-react';
import { db } from '../db';
import { useAccounts, useCategories, useCurrency } from '../hooks';
import { dayLabel, monthKey, monthRange, toInputAmount } from '../lib/format';
import { groupByDate, totals } from '../lib/stats';
import { downloadFile, toCSV } from '../lib/csv';
import type { Transaction } from '../lib/types';
import { MonthPicker } from '../components/MonthPicker';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState, PageHeader } from '../components/ui';

type TypeFilter = 'all' | 'expense' | 'income';

export function Transactions({ onAdd, onEdit }: { onAdd: () => void; onEdit: (t: Transaction) => void }) {
  const { fmt } = useCurrency();
  const { list: catList, byId: cats } = useCategories();
  const { list: accList, byId: accs } = useAccounts();

  const [month, setMonth] = useState(monthKey(new Date()));
  const [allTime, setAllTime] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [minAmt, setMinAmt] = useState('');
  const [maxAmt, setMaxAmt] = useState('');

  const { start, end } = monthRange(month);
  const base = useLiveQuery(
    () => (allTime ? db.transactions.toArray() : db.transactions.where('date').between(start, end, true, true).toArray()),
    [allTime, start, end],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minAmt ? Number(minAmt) * 100 : -Infinity;
    const max = maxAmt ? Number(maxAmt) * 100 : Infinity;
    return (base ?? []).filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (categoryId && t.categoryId !== Number(categoryId)) return false;
      if (accountId && t.accountId !== Number(accountId)) return false;
      if (t.amount < min || t.amount > max) return false;
      if (q) {
        const hay = `${t.note} ${cats.get(t.categoryId)?.name ?? ''} ${accs.get(t.accountId)?.name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [base, query, type, categoryId, accountId, minAmt, maxAmt, cats, accs]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);
  const sum = totals(filtered);
  const hasFilters = query || type !== 'all' || categoryId || accountId || minAmt || maxAmt;

  function clearFilters() {
    setQuery('');
    setType('all');
    setCategoryId('');
    setAccountId('');
    setMinAmt('');
    setMaxAmt('');
  }

  function exportCSV() {
    const rows = [...filtered]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((t) => [t.date, t.type, cats.get(t.categoryId)?.name ?? '', accs.get(t.accountId)?.name ?? '', toInputAmount(t.amount), t.note]);
    const name = allTime ? 'all' : month;
    downloadFile(`transactions-${name}.csv`, toCSV(['Date', 'Type', 'Category', 'Account', 'Amount', 'Note'], rows), 'text/csv;charset=utf-8');
  }

  const visibleCats = catList.filter((c) => type === 'all' || c.kind === type);

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle={`${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`}
        actions={
          <>
            {!allTime && <MonthPicker value={month} onChange={setMonth} />}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allTime} onChange={(e) => setAllTime(e.target.checked)} className="accent-indigo-600" />
              All time
            </label>
            <button className="btn-secondary" onClick={exportCSV} disabled={filtered.length === 0}>
              <Download size={16} /> CSV
            </button>
            <button className="btn-primary" onClick={onAdd}>
              <Plus size={16} /> Add
            </button>
          </>
        }
      />

      <div className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div className="relative sm:col-span-2">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search notes, categories…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
        </div>
        <select className="input" value={type} onChange={(e) => { setType(e.target.value as TypeFilter); setCategoryId(''); }} aria-label="Type">
          <option value="all">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {visibleCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Account">
          <option value="">All accounts</option>
          {accList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="input" inputMode="decimal" placeholder="Min" value={minAmt} onChange={(e) => setMinAmt(e.target.value)} aria-label="Minimum amount" />
          <input className="input" inputMode="decimal" placeholder="Max" value={maxAmt} onChange={(e) => setMaxAmt(e.target.value)} aria-label="Maximum amount" />
        </div>
        {hasFilters && (
          <button className="btn-ghost justify-start text-sm sm:col-span-2 lg:col-span-4 xl:col-span-6" onClick={clearFilters}>
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <Summary label="Income" value={fmt(sum.income)} className="text-emerald-600" />
        <Summary label="Expenses" value={fmt(sum.expense)} className="text-red-600" />
        <Summary label="Net" value={fmt(sum.net)} />
      </div>

      <div className="card">
        {!base ? null : groups.length === 0 ? (
          <EmptyState
            icon={<Receipt size={40} />}
            title={hasFilters ? 'No matching transactions' : 'No transactions yet'}
            hint={hasFilters ? 'Try changing or clearing your filters.' : 'Add your first expense or income to get started.'}
            action={!hasFilters && <button className="btn-primary" onClick={onAdd}><Plus size={16} /> Add transaction</button>}
          />
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <section key={g.date}>
                <div className="flex justify-between border-b border-slate-100 px-2 pb-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <span>{dayLabel(g.date)}</span>
                  <span className="tabular-nums">{g.net >= 0 ? '+' : '−'}{fmt(Math.abs(g.net))}</span>
                </div>
                <div className="-mx-0 mt-1">
                  {g.items.map((t) => (
                    <TransactionRow key={t.id} tx={t} category={cats.get(t.categoryId)} account={accs.get(t.accountId)} fmt={fmt} onClick={() => onEdit(t)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`truncate font-semibold tabular-nums ${className}`}>{value}</div>
    </div>
  );
}
