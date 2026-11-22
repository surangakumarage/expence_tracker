import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, LayoutDashboard, PiggyBank, Plus, Repeat, Settings as SettingsIcon, Tags, Wallet } from 'lucide-react';
import { processRecurring } from './db';
import { useSetting } from './hooks';
import type { Transaction } from './lib/types';
import { TransactionForm } from './components/TransactionForm';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Budgets } from './pages/Budgets';
import { Recurring } from './pages/Recurring';
import { Accounts } from './pages/Accounts';
import { Categories } from './pages/Categories';
import { Settings } from './pages/Settings';
import { LockScreen } from './pages/LockScreen';

export type Page = 'dashboard' | 'transactions' | 'budgets' | 'recurring' | 'accounts' | 'categories' | 'settings';

const NAV: { id: Page; label: string; Icon: typeof Wallet }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { id: 'budgets', label: 'Budgets', Icon: PiggyBank },
  { id: 'recurring', label: 'Recurring', Icon: Repeat },
  { id: 'accounts', label: 'Accounts', Icon: Wallet },
  { id: 'categories', label: 'Categories', Icon: Tags },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

function initialPage(): Page {
  const h = location.hash.slice(1) as Page;
  return NAV.some((n) => n.id === h) ? h : 'dashboard';
}

export default function App({ locked: initiallyLocked }: { locked: boolean }) {
  const [locked, setLocked] = useState(initiallyLocked);
  const [page, setPage] = useState<Page>(initialPage);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const theme = useSetting('theme', 'system');

  // Theme
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && mq.matches));
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  // Hash routing (keeps back button + reload working)
  const go = useCallback((p: Page) => {
    setPage(p);
    history.pushState(null, '', `#${p}`);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const onPop = () => setPage(initialPage());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Catch up recurring rules when the app regains focus (e.g. left open overnight).
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && processRecurring();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const openAdd = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);
  const openEdit = useCallback((t: Transaction) => {
    setEditing(t);
    setFormOpen(true);
  }, []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  // "N" shortcut to add a transaction
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || formOpen || locked) return;
      e.preventDefault();
      openAdd();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [formOpen, locked, openAdd]);

  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;

  return (
    <div className="min-h-full lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-2 px-2">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold">Expense Tracker</span>
        </div>
        <button className="btn-primary mb-4" onClick={openAdd} title="Add transaction (N)">
          <Plus size={16} /> Add transaction
        </button>
        <nav className="space-y-1">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              aria-current={page === id ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                page === id
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <p className="mt-auto px-2 text-xs text-slate-400">Data is stored locally in this browser. Press <kbd className="rounded border px-1">N</kbd> to add.</p>
      </aside>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:pb-10">
        {page === 'dashboard' && <Dashboard onAdd={openAdd} onEdit={openEdit} go={go} />}
        {page === 'transactions' && <Transactions onAdd={openAdd} onEdit={openEdit} />}
        {page === 'budgets' && <Budgets />}
        {page === 'recurring' && <Recurring />}
        {page === 'accounts' && <Accounts />}
        {page === 'categories' && <Categories />}
        {page === 'settings' && <Settings />}
      </main>

      {/* Bottom nav (mobile) */}
      <button
        className="fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 lg:hidden"
        onClick={openAdd}
        aria-label="Add transaction"
      >
        <Plus size={26} />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => go(id)}
            aria-label={label}
            aria-current={page === id ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${page === id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
          >
            <Icon size={20} />
            <span className="max-w-full truncate px-0.5">{label}</span>
          </button>
        ))}
      </nav>

      <TransactionForm open={formOpen} onClose={closeForm} editing={editing} />
    </div>
  );
}
