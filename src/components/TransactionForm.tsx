import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { db } from '../db';
import { useAccounts, useCategories } from '../hooks';
import { parseAmount, toInputAmount, today } from '../lib/format';
import { advanceDate } from '../lib/recurring';
import type { Frequency, Transaction, TxType } from '../lib/types';
import { CategoryIcon } from './CategoryIcon';
import { Modal, Segmented } from './ui';

type Repeat = 'none' | Frequency;

export function TransactionForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Transaction | null;
}) {
  const { list: categories } = useCategories();
  const { list: accounts } = useAccounts();

  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [error, setError] = useState('');

  // Reset form whenever it opens.
  useEffect(() => {
    if (!open) return;
    setError('');
    setRepeat('none');
    if (editing) {
      setType(editing.type);
      setAmount(toInputAmount(editing.amount));
      setCategoryId(editing.categoryId);
      setAccountId(editing.accountId);
      setDate(editing.date);
      setNote(editing.note);
    } else {
      setType('expense');
      setAmount('');
      setCategoryId(null);
      setAccountId(null);
      setDate(today());
      setNote('');
    }
  }, [open, editing]);

  const visibleCats = useMemo(() => categories.filter((c) => c.kind === type), [categories, type]);
  const activeAccounts = accounts.filter((a) => !a.archived || a.id === accountId);
  const effectiveAccount = accountId ?? activeAccounts[0]?.id ?? null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const minor = parseAmount(amount);
    if (!Number.isFinite(minor) || minor <= 0) return setError('Enter an amount greater than 0.');
    if (categoryId == null || !visibleCats.some((c) => c.id === categoryId)) return setError('Choose a category.');
    if (effectiveAccount == null) return setError('Create an account first (Accounts page).');
    if (!date) return setError('Choose a date.');

    const data = { type, amount: minor, categoryId, accountId: effectiveAccount, date, note: note.trim() };
    if (editing?.id != null) {
      await db.transactions.update(editing.id, data);
    } else {
      let recurringId: number | undefined;
      if (repeat !== 'none') {
        recurringId = await db.recurring.add({
          ...data,
          frequency: repeat,
          nextDate: advanceDate(date, repeat),
          active: true,
        });
      }
      await db.transactions.add({ ...data, recurringId, createdAt: Date.now() });
    }
    onClose();
  }

  async function remove() {
    if (editing?.id == null) return;
    if (!confirm('Delete this transaction?')) return;
    await db.transactions.delete(editing.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit transaction' : 'Add transaction'}>
      <form onSubmit={submit} className="space-y-4">
        <Segmented
          value={type}
          onChange={(t) => {
            setType(t);
            setCategoryId(null);
          }}
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
        />

        <div>
          <label className="label" htmlFor="amount">Amount</label>
          <input
            id="amount"
            className="input text-2xl font-semibold"
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <span className="label">Category</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {visibleCats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id!)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition ${
                  categoryId === c.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                <CategoryIcon icon={c.icon} color={c.color} size={30} />
                <span className="line-clamp-1">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="account">Account</label>
            <select
              id="account"
              className="input"
              value={effectiveAccount ?? ''}
              onChange={(e) => setAccountId(Number(e.target.value))}
            >
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="note">Note</label>
          <input id="note" className="input" placeholder="e.g. Lunch with team" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </div>

        {!editing && (
          <div>
            <label className="label" htmlFor="repeat">Repeat</label>
            <select id="repeat" className="input" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-2">
          {editing ? (
            <button type="button" className="btn-ghost text-red-600" onClick={remove}>
              <Trash2 size={16} /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save' : 'Add'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
