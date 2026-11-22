import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Banknote, CreditCard, Landmark, Plus, Smartphone, Trash2 } from 'lucide-react';
import { db } from '../db';
import { useAccounts, useCurrency } from '../hooks';
import { parseAmount, toInputAmount } from '../lib/format';
import { accountBalances } from '../lib/stats';
import type { Account, AccountType } from '../lib/types';
import { ColorPicker, Modal, PageHeader } from '../components/ui';

const TYPE_META: Record<AccountType, { label: string; Icon: typeof Banknote }> = {
  cash: { label: 'Cash', Icon: Banknote },
  bank: { label: 'Bank account', Icon: Landmark },
  card: { label: 'Credit card', Icon: CreditCard },
  wallet: { label: 'E-wallet', Icon: Smartphone },
};

export function Accounts() {
  const { fmt } = useCurrency();
  const { list } = useAccounts();
  const txs = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const balances = accountBalances(list, txs);
  const [editing, setEditing] = useState<Account | null | undefined>(undefined);

  const total = list.filter((a) => !a.archived).reduce((s, a) => s + (balances.get(a.id!) ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={`Total balance ${fmt(total)}`}
        actions={<button className="btn-primary" onClick={() => setEditing(null)}><Plus size={16} /> New account</button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a) => {
          const { Icon, label } = TYPE_META[a.type];
          const bal = balances.get(a.id!) ?? 0;
          const count = txs.filter((t) => t.accountId === a.id).length;
          return (
            <button key={a.id} className={`card text-left transition hover:shadow-md ${a.archived ? 'opacity-50' : ''}`} onClick={() => setEditing(a)}>
              <div className="flex items-center gap-3">
                <span className="rounded-xl p-2" style={{ background: `${a.color}22`, color: a.color }}><Icon size={20} /></span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{a.name}</div>
                  <div className="text-xs text-slate-500">{label}{a.archived && ' · archived'} · {count} txns</div>
                </div>
              </div>
              <div className={`mt-3 text-2xl font-bold tabular-nums ${bal < 0 ? 'text-red-600' : ''}`}>{fmt(bal)}</div>
            </button>
          );
        })}
      </div>
      <AccountForm account={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}

function AccountForm({ account, onClose }: { account: Account | null | undefined; onClose: () => void }) {
  const open = account !== undefined;
  return (
    <Modal open={open} onClose={onClose} title={account ? 'Edit account' : 'New account'}>
      {open && <AccountFormBody key={account?.id ?? 'new'} account={account} onClose={onClose} />}
    </Modal>
  );
}

function AccountFormBody({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank');
  const [opening, setOpening] = useState(account ? toInputAmount(account.openingBalance) : '0');
  const [color, setColor] = useState(account?.color ?? '#2563eb');
  const [archived, setArchived] = useState(account?.archived ?? false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Enter a name.');
    const neg = opening.trim().startsWith('-');
    const parsed = parseAmount(opening.replace('-', '') || '0');
    if (!Number.isFinite(parsed)) return setError('Enter a valid opening balance.');
    const data = { name: name.trim(), type, openingBalance: neg ? -parsed : parsed, color, archived };
    if (account?.id != null) await db.accounts.update(account.id, data);
    else await db.accounts.add(data);
    onClose();
  }

  async function remove() {
    if (account?.id == null) return;
    const used = await db.transactions.where('accountId').equals(account.id).count();
    if (used > 0) return setError(`This account has ${used} transactions. Archive it instead, or delete those first.`);
    if (!confirm(`Delete account "${account.name}"?`)) return;
    await db.accounts.delete(account.id);
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="a-name">Name</label>
        <input id="a-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Savings" maxLength={60} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="a-type">Type</label>
          <select id="a-type" className="input" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {Object.entries(TYPE_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-open">Opening balance</label>
          <input id="a-open" className="input" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </div>
      </div>
      <div>
        <span className="label">Color</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      {account && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-indigo-600" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
          Archived (hidden from new transactions and total balance)
        </label>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-between pt-2">
        {account ? <button type="button" className="btn-ghost text-red-600" onClick={remove}><Trash2 size={16} /> Delete</button> : <span />}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </div>
    </form>
  );
}
