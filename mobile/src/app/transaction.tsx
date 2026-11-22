import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { deleteTransaction, getTransaction, saveRecurring, saveTransaction } from '../data/db';
import { useAccounts, useCategories } from '../data/hooks';
import { useTheme } from '../data/settings';
import { parseAmount, toInputAmount, today } from '../lib/format';
import { advanceDate, FREQUENCY_LABEL } from '../lib/recurring';
import { closeScreen, confirm } from '../lib/platform';
import type { Frequency, TxType } from '../lib/types';
import { CategoryIcon } from '../components/CategoryIcon';
import { DateField } from '../components/DateField';
import { Button, Chip, ErrorText, Input, Label, Row, Screen, Segmented, T } from '../components/ui';

type Repeat = 'none' | Frequency;

export default function TransactionScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : undefined;
  const { list: categories } = useCategories();
  const { list: accounts } = useAccounts();

  const [loaded, setLoaded] = useState(id == null);
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id == null) return;
    getTransaction(id).then((tx) => {
      if (tx) {
        setType(tx.type);
        setAmount(toInputAmount(tx.amount));
        setCategoryId(tx.categoryId);
        setAccountId(tx.accountId);
        setDate(tx.date);
        setNote(tx.note);
      }
      setLoaded(true);
    });
  }, [id]);

  const cats = categories.filter((c) => c.kind === type);
  const activeAccounts = accounts.filter((a) => !a.archived || a.id === accountId);
  const acct = accountId ?? activeAccounts[0]?.id ?? null;

  async function submit() {
    const minor = parseAmount(amount);
    if (!Number.isFinite(minor) || minor <= 0) return setError('Enter an amount greater than 0.');
    if (categoryId == null || !cats.some((c) => c.id === categoryId)) return setError('Choose a category.');
    if (acct == null) return setError('Create an account first.');
    setSaving(true);
    const data = { type, amount: minor, categoryId, accountId: acct, date, note: note.trim() };
    try {
      if (id != null) await saveTransaction(data, id);
      else {
        const recurringId = repeat !== 'none'
          ? await saveRecurring({ ...data, frequency: repeat, nextDate: advanceDate(date, repeat), active: true })
          : undefined;
        await saveTransaction({ ...data, recurringId });
      }
      closeScreen();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  async function remove() {
    if (id == null || !(await confirm('Delete transaction?', 'This cannot be undone.', 'Delete', true))) return;
    await deleteTransaction(id);
    closeScreen();
  }

  if (!loaded) return <Screen><View /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: id != null ? 'Edit transaction' : 'Add transaction' }} />
      <Segmented
        value={type}
        onChange={(v) => { setType(v); setCategoryId(null); }}
        options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
      />
      <Input
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        autoFocus={id == null}
        style={{ fontSize: 28, fontWeight: '700' }}
      />

      <Label>Category</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {cats.map((c) => {
          const active = categoryId === c.id;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setCategoryId(c.id!)}
              style={{
                width: '23%', flexGrow: 1, alignItems: 'center', gap: 4, padding: 8, borderRadius: 12, borderWidth: 1.5,
                borderColor: active ? t.primary : t.border, backgroundColor: active ? t.primarySoft : t.card,
              }}
            >
              <CategoryIcon icon={c.icon} color={c.color} size={32} />
              <T size={11} numberOfLines={1}>{c.name}</T>
            </Pressable>
          );
        })}
      </View>

      <Label>Account</Label>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {activeAccounts.map((a) => (
          <Chip key={a.id} label={a.name} color={a.color} active={acct === a.id} onPress={() => setAccountId(a.id!)} />
        ))}
      </Row>

      <DateField label="Date" value={date} onChange={setDate} />
      <Input label="Note" value={note} onChangeText={setNote} placeholder="e.g. Lunch with team" maxLength={200} />

      {id == null && (
        <>
          <Label>Repeat</Label>
          <Row style={{ flexWrap: 'wrap', gap: 8 }}>
            <Chip label="Never" active={repeat === 'none'} onPress={() => setRepeat('none')} />
            {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
              <Chip key={f} label={FREQUENCY_LABEL[f]} active={repeat === f} onPress={() => setRepeat(f)} />
            ))}
          </Row>
        </>
      )}

      <ErrorText>{error}</ErrorText>
      <Button title={id != null ? 'Save' : 'Add transaction'} onPress={submit} loading={saving} />
      {id != null && <Button title="Delete" variant="ghost" icon="trash-outline" onPress={remove} style={{ alignSelf: 'center' }} />}
    </Screen>
  );
}
