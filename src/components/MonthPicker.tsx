import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthKey, monthLabel, shiftMonth } from '../lib/format';

export function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const isCurrent = value === monthKey(new Date());
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
      <button className="btn-ghost py-1" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month">
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-32 text-center text-sm font-medium">{monthLabel(value)}</span>
      <button
        className="btn-ghost py-1"
        onClick={() => onChange(shiftMonth(value, 1))}
        aria-label="Next month"
        disabled={isCurrent}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
