import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { db } from '../db';
import { useCategories } from '../hooks';
import type { Category, TxType } from '../lib/types';
import { CategoryIcon, ICONS } from '../components/CategoryIcon';
import { ColorPicker, Modal, PageHeader, Segmented } from '../components/ui';

export function Categories() {
  const { list } = useCategories();
  const [kind, setKind] = useState<TxType>('expense');
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const shown = list.filter((c) => c.kind === kind);

  return (
    <div>
      <PageHeader
        title="Categories"
        actions={<button className="btn-primary" onClick={() => setEditing(null)}><Plus size={16} /> New category</button>}
      />
      <div className="mb-4">
        <Segmented value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((c) => (
          <button key={c.id} className="card flex items-center gap-3 text-left transition hover:shadow-md" onClick={() => setEditing(c)}>
            <CategoryIcon icon={c.icon} color={c.color} />
            <span className="truncate text-sm font-medium">{c.name}</span>
          </button>
        ))}
      </div>
      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit category' : 'New category'}>
        {editing !== undefined && (
          <CategoryForm key={editing?.id ?? 'new'} category={editing} defaultKind={kind} onClose={() => setEditing(undefined)} />
        )}
      </Modal>
    </div>
  );
}

function CategoryForm({ category, defaultKind, onClose }: { category: Category | null; defaultKind: TxType; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [kind, setKind] = useState<TxType>(category?.kind ?? defaultKind);
  const [color, setColor] = useState(category?.color ?? '#6366f1');
  const [icon, setIcon] = useState(category?.icon ?? 'circle');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Enter a name.');
    const data = { name: name.trim(), kind, color, icon };
    if (category?.id != null) await db.categories.update(category.id, data);
    else await db.categories.add(data);
    onClose();
  }

  async function remove() {
    if (category?.id == null) return;
    const used = await db.transactions.where('categoryId').equals(category.id).count();
    const usedRec = await db.recurring.filter((r) => r.categoryId === category.id).count();
    if (used + usedRec > 0) {
      return setError(`Used by ${used} transaction(s) and ${usedRec} recurring rule(s). Reassign them before deleting.`);
    }
    if (!confirm(`Delete category "${category.name}"?`)) return;
    await db.budgets.where('categoryId').equals(category.id).delete();
    await db.categories.delete(category.id);
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} size={44} />
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" maxLength={40} aria-label="Name" autoFocus />
      </div>
      {!category && (
        <Segmented value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
      )}
      <div>
        <span className="label">Color</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div>
        <span className="label">Icon</span>
        <div className="grid grid-cols-7 gap-2 sm:grid-cols-9">
          {Object.keys(ICONS).map((k) => (
            <button
              key={k}
              type="button"
              aria-label={k}
              onClick={() => setIcon(k)}
              className={`rounded-xl p-0.5 ${icon === k ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <CategoryIcon icon={k} color={color} size={34} />
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-between pt-2">
        {category ? <button type="button" className="btn-ghost text-red-600" onClick={remove}><Trash2 size={16} /> Delete</button> : <span />}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </div>
    </form>
  );
}
