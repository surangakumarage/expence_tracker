import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pause, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { db, processRecurring } from '../db';
import { useAccounts, useCategories, useCurrency } from '../hooks';
import { dayLabel, parseAmount, toInputAmount, today } from '../lib/format';
import { FREQUENCY_LABEL } from '../lib/recurring';
import type { Frequency, Recurring as Rule, TxType } from '../lib/types';
import { CategoryIcon } from '../components/CategoryIcon';
import { EmptyState, Modal, PageHeader, Segmented } from '../components/ui';

const MONTHLY_FACTOR: Record<Frequency, number> = { daily: 30.44, weekly: 4.345, monthly: 1, yearly: 1 / 12 };

export function Recurring() {
  const { fmt } = useCurrency();
  const { byId: cats } = useCategories();
  const { byId: accs } = useAccounts();
  const rules = useLiveQuery(() => db.recurring.orderBy('nextDate').toArray(), []);
  const [editing, setEditing] = useState<Rule | null | undefined>(undefined);

  if (!rules) return null;
  const active = rules.filter((r) => r.active);
  const monthlyOut = active.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount * MONTHLY_FACTOR[r.frequency], 0);
  const monthlyIn = active.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount * MONTHLY_FACTOR[r.frequency], 0);

  return (
    <div>
      <PageHeader
        title="Recurring"
        subtitle="Bills, subscriptions and salary that repeat automatically"
        actions={<button className="btn-primary" onClick={() => setEditing(null)}><Plus size={16} /> New rule</button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-sm text-slate-500 dark:text-slate-400">Est. monthly fixed costs</div>
          <div className="text-xl font-bold tabular-nums text-red-600">{fmt(Math.round(monthlyOut))}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500 dark:text-slate-400">Est. monthly recurring income</div>
          <div className="text-xl font-bold tabular-nums text-emerald-600">{fmt(Math.round(monthlyIn))}</div>
        </div>
      </div>

      <div className="card p-2">
        {rules.length === 0 ? (
          <EmptyState
            icon={<Repeat size={40} />}
            title="No recurring transactions"
            hint="Add rent, subscriptions or salary once, and they'll be recorded automatically on each due date."
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rules.map((r) => {
              const c = cats.get(r.categoryId);
              return (
                <li key={r.id} className={`flex items-center gap-3 p-2 ${r.active ? '' : 'opacity-50'}`}>
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setEditing(r)}>
                    <CategoryIcon icon={c?.icon} color={c?.color} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.note || c?.name}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {FREQUENCY_LABEL[r.frequency]} · {accs.get(r.accountId)?.name} ·{' '}
                        {r.active ? `next ${dayLabel(r.nextDate)}` : 'paused'}
                      </div>
                    </div>
                    <div className={`text-sm font-semibold tabular-nums ${r.type === 'income' ? 'text-emerald-600' : ''}`}>
                      {r.type === 'income' ? '+' : '−'}{fmt(r.amount)}
                    </div>
                  </button>
                  <button
                    className="btn-ghost"
                    aria-label={r.active ? 'Pause' : 'Resume'}
                    title={r.active ? 'Pause' : 'Resume'}
                    onClick={async () => {
                      await db.recurring.update(r.id!, { active: !r.active, ...(r.active ? {} : { nextDate: r.nextDate < today() ? today() : r.nextDate }) });
                      if (!r.active) await processRecurring();
                    }}
                  >
                    {r.active ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <RuleForm rule={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}

function RuleForm({ rule, onClose }: { rule: Rule | null | undefined; onClose: () => void }) {
  const open = rule !== undefined;
  return (
    <Modal open={open} onClose={onClose} title={rule ? 'Edit recurring rule' : 'New recurring rule'}>
      {open && <RuleFormBody key={rule?.id ?? 'new'} rule={rule} onClose={onClose} />}
    </Modal>
  );
}

function RuleFormBody({ rule, onClose }: { rule: Rule | null; onClose: () => void }) {
  const { list: categories } = useCategories();
  const { list: accounts } = useAccounts();
  const [type, setType] = useState<TxType>(rule?.type ?? 'expense');
  const [amount, setAmount] = useState(rule ? toInputAmount(rule.amount) : '');
  const [categoryId, setCategoryId] = useState<number | ''>(rule?.categoryId ?? '');
  const [accountId, setAccountId] = useState<number | ''>(rule?.accountId ?? '');
  const [frequency, setFrequency] = useState<Frequency>(rule?.frequency ?? 'monthly');
  const [nextDate, setNextDate] = useState(rule?.nextDate ?? today());
  const [endDate, setEndDate] = useState(rule?.endDate ?? '');
  const [note, setNote] = useState(rule?.note ?? '');
  const [error, setError] = useState('');

  const cats = categories.filter((c) => c.kind === type);
  const acct = accountId === '' ? accounts[0]?.id : accountId;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const minor = parseAmount(amount);
    if (!Number.isFinite(minor) || minor <= 0) return setError('Enter an amount greater than 0.');
    if (categoryId === '' || !cats.some((c) => c.id === categoryId)) return setError('Choose a category.');
    if (acct == null) return setError('Create an account first.');
    if (endDate && endDate < nextDate) return setError('End date must be after the next date.');
    const data = {
      type, amount: minor, categoryId, accountId: acct, frequency, nextDate,
      endDate: endDate || undefined, note: note.trim(), active: rule?.active ?? true,
    };
    if (rule?.id != null) await db.recurring.update(rule.id, data);
    else await db.recurring.add(data);
    await processRecurring();
    onClose();
  }

  async function remove() {
    if (rule?.id == null) return;
    if (!confirm('Delete this rule? Transactions already created are kept.')) return;
    await db.recurring.delete(rule.id);
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Segmented value={type} onChange={(t) => { setType(t); setCategoryId(''); }} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="r-amount">Amount</label>
          <input id="r-amount" className="input" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="r-freq">Frequency</label>
          <select id="r-freq" className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            {Object.entries(FREQUENCY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="r-cat">Category</label>
          <select id="r-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
            <option value="" disabled>Choose…</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="r-acc">Account</label>
          <select id="r-acc" className="input" value={acct ?? ''} onChange={(e) => setAccountId(Number(e.target.value))}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="r-next">Next date</label>
          <input id="r-next" type="date" className="input" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="r-end">Ends (optional)</label>
          <input id="r-end" type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="r-note">Name / note</label>
        <input id="r-note" className="input" placeholder="e.g. Netflix, Rent" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </div>
      <p className="text-xs text-slate-500">If the next date is today or earlier, the missed transactions are created right away.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-between pt-2">
        {rule ? <button type="button" className="btn-ghost text-red-600" onClick={remove}><Trash2 size={16} /> Delete</button> : <span />}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </div>
    </form>
  );
}
