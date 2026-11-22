import { useState } from 'react';
import { Switch } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { deleteAccount, saveAccount } from '../data/db';
import { useAccounts } from '../data/hooks';
import { parseAmount, toInputAmount } from '../lib/format';
import { closeScreen, confirm } from '../lib/platform';
import type { Account, AccountType } from '../lib/types';
import { Button, Chip, ColorPicker, ErrorText, Input, Label, Row, Screen, T } from '../components/ui';
import { ACCOUNT_TYPES } from '../components/accountTypes';

export default function AccountEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { byId, list } = useAccounts();
  const account = id ? byId.get(Number(id)) : undefined;
  if (id && list.length === 0) return <Screen><T muted>Loading…</T></Screen>;
  return <AccountForm key={account?.id ?? 'new'} account={account} />;
}

function AccountForm({ account }: { account?: Account }) {
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank');
  const [opening, setOpening] = useState(account ? toInputAmount(account.openingBalance) : '0');
  const [color, setColor] = useState(account?.color ?? '#2563eb');
  const [archived, setArchived] = useState(account?.archived ?? false);
  const [error, setError] = useState('');

  async function submit() {
    if (!name.trim()) return setError('Enter a name.');
    const neg = opening.trim().startsWith('-');
    const parsed = parseAmount(opening.replace('-', '') || '0');
    if (!Number.isFinite(parsed)) return setError('Enter a valid opening balance.');
    await saveAccount({ name: name.trim(), type, openingBalance: neg ? -parsed : parsed, color, archived }, account?.id);
    closeScreen();
  }

  async function remove() {
    if (!account?.id || !(await confirm('Delete account?', `Delete "${account.name}"?`, 'Delete', true))) return;
    const err = await deleteAccount(account.id);
    if (err) setError(err);
    else closeScreen();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: account ? 'Edit account' : 'New account' }} />
      <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Savings" maxLength={60} />
      <Label>Type</Label>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(ACCOUNT_TYPES) as AccountType[]).map((k) => (
          <Chip key={k} label={ACCOUNT_TYPES[k].label} active={type === k} onPress={() => setType(k)} />
        ))}
      </Row>
      <Input label="Opening balance" value={opening} onChangeText={setOpening} keyboardType="numbers-and-punctuation" />
      <Label>Color</Label>
      <ColorPicker value={color} onChange={setColor} />
      {account && (
        <Row style={{ justifyContent: 'space-between' }}>
          <T>Archived</T>
          <Switch value={archived} onValueChange={setArchived} />
        </Row>
      )}
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={submit} />
      {account && <Button title="Delete" variant="ghost" icon="trash-outline" onPress={remove} style={{ alignSelf: 'center' }} />}
    </Screen>
  );
}
