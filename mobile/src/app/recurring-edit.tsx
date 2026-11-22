import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { deleteRecurring, getRecurring, processRecurring, saveRecurring } from '../data/db';
import { useAccounts, useCategories } from '../data/hooks';
import { parseAmount, toInputAmount, today } from '../lib/format';
import { FREQUENCY_LABEL } from '../lib/recurring';
import { closeScreen, confirm } from '../lib/platform';
import type { Frequency, Recurring, TxType } from '../lib/types';
import { DateField } from '../components/DateField';
import { Button, Chip, ErrorText, Input, Label, Row, Screen, Segmented, T } from '../components/ui';

export default function RecurringEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [rule, setRule] = useState<Recurring | null | undefined>(id ? undefined : null);
  useEffect(() => {
    if (id) getRecurring(Number(id)).then(setRule);
  }, [id]);
  if (rule === undefined) return <Screen><T muted>Loading…</T></Screen>;
  return <RuleForm rule={rule} />;
}

function RuleForm({ rule }: { rule: Recurring | null }) {
  const { list: categories } = useCategories();
  const { list: accounts } = useAccounts();
  const [type, setType] = useState<TxType>(rule?.type ?? 'expense');
  const [amount, setAmount] = useState(rule ? toInputAmount(rule.amount) : '');
  const [categoryId, setCategoryId] = useState<number | null>(rule?.categoryId ?? null);
  const [accountId, setAccountId] = useState<number | null>(rule?.accountId ?? null);
  const [frequency, setFrequency] = useState<Frequency>(rule?.frequency ?? 'monthly');
  const [nextDate, setNextDate] = useState(rule?.nextDate ?? today());
  const [endDate, setEndDate] = useState(rule?.endDate ?? '');
  const [note, setNote] = useState(rule?.note ?? '');
  const [error, setError] = useState('');

  const cats = categories.filter((c) => c.kind === type);
  const acct = accountId ?? accounts.find((a) => !a.archived)?.id ?? null;

  async function submit() {
    const minor = parseAmount(amount);
    if (!Number.isFinite(minor) || minor <= 0) return setError('Enter an amount greater than 0.');
    if (categoryId == null || !cats.some((c) => c.id === categoryId)) return setError('Choose a category.');
    if (acct == null) return setError('Create an account first.');
    if (endDate && endDate < nextDate) return setError('End date must be after the next date.');
    await saveRecurring(
      { type, amount: minor, categoryId, accountId: acct, frequency, nextDate, endDate: endDate || undefined, note: note.trim(), active: rule?.active ?? true },
      rule?.id,
    );
    await processRecurring();
    closeScreen();
  }

  async function remove() {
    if (!rule?.id || !(await confirm('Delete rule?', 'Transactions already created are kept.', 'Delete', true))) return;
    await deleteRecurring(rule.id);
    closeScreen();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: rule ? 'Edit recurring rule' : 'New recurring rule' }} />
      <Segmented value={type} onChange={(v) => { setType(v); setCategoryId(null); }} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
      <Input label="Name / note" value={note} onChangeText={setNote} placeholder="e.g. Netflix, Rent" maxLength={200} />
      <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
      <Label>Frequency</Label>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
          <Chip key={f} label={FREQUENCY_LABEL[f]} active={frequency === f} onPress={() => setFrequency(f)} />
        ))}
      </Row>
      <Label>Category</Label>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {cats.map((c) => <Chip key={c.id} label={c.name} color={c.color} active={categoryId === c.id} onPress={() => setCategoryId(c.id!)} />)}
      </Row>
      <Label>Account</Label>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {accounts.filter((a) => !a.archived).map((a) => <Chip key={a.id} label={a.name} active={acct === a.id} onPress={() => setAccountId(a.id!)} />)}
      </Row>
      <DateField label="Next date" value={nextDate} onChange={setNextDate} />
      <DateField label="Ends (optional)" value={endDate} onChange={setEndDate} optional />
      <T muted size={12}>If the next date is today or earlier, missed transactions are created right away.</T>
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={submit} />
      {rule && <Button title="Delete" variant="ghost" icon="trash-outline" onPress={remove} style={{ alignSelf: 'center' }} />}
    </Screen>
  );
}
