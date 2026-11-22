import { Repeat } from 'lucide-react';
import type { Account, Category, Transaction } from '../lib/types';
import { CategoryIcon } from './CategoryIcon';

export function TransactionRow({
  tx,
  category,
  account,
  fmt,
  onClick,
}: {
  tx: Transaction;
  category?: Category;
  account?: Account;
  fmt: (n: number) => string;
  onClick?: () => void;
}) {
  const income = tx.type === 'income';
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
    >
      <CategoryIcon icon={category?.icon} color={category?.color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate text-sm font-medium">
          {category?.name ?? 'Uncategorized'}
          {tx.recurringId != null && <Repeat size={12} className="text-slate-400" aria-label="Recurring" />}
        </div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
          {[tx.note, account?.name].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className={`shrink-0 text-sm font-semibold tabular-nums ${income ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
        {income ? '+' : '−'}
        {fmt(tx.amount)}
      </div>
    </button>
  );
}
