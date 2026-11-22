import { useRef, useState } from 'react';
import { Database, Download, FileSpreadsheet, Lock, Palette, Upload, Wand2 } from 'lucide-react';
import { db, exportBackup, importBackup, resetAll } from '../db';
import { setSetting, useSetting } from '../hooks';
import { downloadFile, toCSV } from '../lib/csv';
import { today, toInputAmount } from '../lib/format';
import { hashPin, newSalt } from '../lib/pin';
import { loadSampleData } from '../lib/sample';
import { PageHeader, Segmented } from '../components/ui';

const COMMON = ['USD', 'EUR', 'GBP', 'LKR', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'JPY'];

function allCurrencies(): string[] {
  try {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('currency') ?? [];
    return [...COMMON, ...all.filter((c) => !COMMON.includes(c))];
  } catch {
    return COMMON;
  }
}

export function Settings() {
  const currency = useSetting('currency', 'USD');
  const theme = useSetting('theme', 'system');
  const pinHash = useSetting('pinHash');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  async function backup() {
    const data = await exportBackup();
    downloadFile(`expense-tracker-backup-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
    flash('Backup downloaded.');
  }

  async function restore(file: File) {
    try {
      const data = JSON.parse(await file.text());
      if (!confirm('Restoring replaces ALL current data with the backup. Continue?')) return;
      await importBackup(data);
      flash('Backup restored.');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not read that file.', false);
    }
  }

  async function exportAllCSV() {
    const [txs, cats, accs] = await Promise.all([db.transactions.orderBy('date').toArray(), db.categories.toArray(), db.accounts.toArray()]);
    const c = new Map(cats.map((x) => [x.id, x.name]));
    const a = new Map(accs.map((x) => [x.id, x.name]));
    const rows = txs.map((t) => [t.date, t.type, c.get(t.categoryId) ?? '', a.get(t.accountId) ?? '', toInputAmount(t.amount), t.note]);
    downloadFile(`transactions-all-${today()}.csv`, toCSV(['Date', 'Type', 'Category', 'Account', 'Amount', 'Note'], rows), 'text/csv;charset=utf-8');
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" />
      {msg && (
        <div className={`mb-4 rounded-xl px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>
          {msg.text}
        </div>
      )}

      <Section icon={<Palette size={18} />} title="Preferences">
        <Row label="Currency" hint="Used for displaying all amounts.">
          <select className="input w-32" value={currency} onChange={(e) => setSetting('currency', e.target.value)} aria-label="Currency">
            {allCurrencies().map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Row>
        <Row label="Theme">
          <Segmented
            value={theme as 'system' | 'light' | 'dark'}
            onChange={(v) => setSetting('theme', v)}
            options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          />
        </Row>
      </Section>

      <Section icon={<Lock size={18} />} title="App lock">
        <PinSettings enabled={!!pinHash} onDone={flash} />
      </Section>

      <Section icon={<Database size={18} />} title="Data">
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Your data is stored only in this browser. Download a backup regularly so you don't lose it if browser data is cleared.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={backup}><Download size={16} /> Backup (JSON)</button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={16} /> Restore backup</button>
          <button className="btn-secondary" onClick={exportAllCSV}><FileSpreadsheet size={16} /> Export all (CSV)</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) restore(f);
              e.target.value = '';
            }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            className="btn-secondary"
            onClick={async () => {
              try {
                const n = await loadSampleData();
                flash(`Added ${n} sample transactions and starter budgets.`);
              } catch (e) {
                flash(e instanceof Error ? e.message : 'Failed', false);
              }
            }}
          >
            <Wand2 size={16} /> Load sample data
          </button>
          <button
            className="btn-danger"
            onClick={async () => {
              if (!confirm('Delete ALL transactions, budgets, accounts and settings? This cannot be undone.')) return;
              await resetAll();
              location.reload();
            }}
          >
            Erase all data
          </button>
        </div>
      </Section>
    </div>
  );
}

function PinSettings({ enabled, onDone }: { enabled: boolean; onDone: (t: string, ok?: boolean) => void }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [editing, setEditing] = useState(false);

  async function save() {
    if (!/^\d{4,8}$/.test(pin)) return onDone('PIN must be 4–8 digits.', false);
    if (pin !== confirmPin) return onDone('PINs do not match.', false);
    const salt = newSalt();
    await setSetting('pinSalt', salt);
    await setSetting('pinHash', await hashPin(pin, salt));
    setPin('');
    setConfirmPin('');
    setEditing(false);
    onDone('PIN lock enabled. You will be asked for it when the app opens.');
  }

  async function disable() {
    if (!confirm('Remove PIN lock?')) return;
    await db.settings.bulkDelete(['pinHash', 'pinSalt']);
    onDone('PIN lock removed.');
  }

  if (!editing) {
    return (
      <Row label={enabled ? 'PIN lock is on' : 'PIN lock is off'} hint="Ask for a PIN when the app is opened.">
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setEditing(true)}>{enabled ? 'Change PIN' : 'Set PIN'}</button>
          {enabled && <button className="btn-ghost text-red-600" onClick={disable}>Remove</button>}
        </div>
      </Row>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label" htmlFor="pin1">New PIN</label>
        <input id="pin1" className="input w-32" type="password" inputMode="numeric" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="pin2">Confirm</label>
        <input id="pin2" className="input w-32" type="password" inputMode="numeric" maxLength={8} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
      </div>
      <button className="btn-primary" onClick={save}>Save</button>
      <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="card mb-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">{icon} {title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
