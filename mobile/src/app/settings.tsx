import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deleteSettings, exportBackup, importBackup, listAccounts, listCategories, listTransactions, resetAll, setSetting } from '../data/db';
import { loadSampleData } from '../data/sample';
import { useSettings } from '../data/settings';
import { today, toInputAmount } from '../lib/format';
import { toCSV } from '../lib/csv';
import { confirm, hashPin, newSalt, notify, pickJsonFile, shareTextFile } from '../lib/platform';
import { Button, Card, Chip, ErrorText, Input, Row, Screen, Segmented, T, type IconName } from '../components/ui';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'LKR', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'JPY', 'NZD', 'CHF', 'MYR', 'PKR', 'BDT'];

export default function Settings() {
  const { currency, themePref, settings, theme: t } = useSettings();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      notify('Something went wrong', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Section icon="color-palette" title="Preferences">
        <T muted size={13}>Currency</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(CURRENCIES.includes(currency) ? CURRENCIES : [currency, ...CURRENCIES]).map((c) => (
            <Chip key={c} label={c} active={currency === c} onPress={() => setSetting('currency', c)} />
          ))}
        </ScrollView>
        <T muted size={13}>Theme</T>
        <Segmented
          value={themePref}
          onChange={(v) => setSetting('theme', v)}
          options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
        />
      </Section>

      <Section icon="lock-closed" title="App lock">
        <PinSettings enabled={!!settings.pinHash} />
      </Section>

      <Section icon="server" title="Data">
        <T muted size={13}>Your data is stored only on this device. Export a backup regularly; it uses the same format as the web app, so you can move data between them.</T>
        <Button
          title="Export backup (JSON)"
          variant="secondary"
          icon="download-outline"
          loading={busy === 'backup'}
          onPress={() => run('backup', async () => {
            await shareTextFile(`expense-tracker-backup-${today()}.json`, JSON.stringify(await exportBackup(), null, 2), 'application/json');
          })}
        />
        <Button
          title="Restore backup"
          variant="secondary"
          icon="cloud-upload-outline"
          loading={busy === 'restore'}
          onPress={() => run('restore', async () => {
            const text = await pickJsonFile();
            if (text == null) return;
            const data = JSON.parse(text);
            if (!(await confirm('Restore backup?', 'This replaces ALL current data with the backup.', 'Restore', true))) return;
            await importBackup(data);
            notify('Backup restored');
          })}
        />
        <Button
          title="Export all transactions (CSV)"
          variant="secondary"
          icon="document-text-outline"
          loading={busy === 'csv'}
          onPress={() => run('csv', async () => {
            const [txs, cats, accs] = await Promise.all([listTransactions(), listCategories(), listAccounts()]);
            const c = new Map(cats.map((x) => [x.id, x.name]));
            const a = new Map(accs.map((x) => [x.id, x.name]));
            const rows = [...txs].reverse().map((x) => [x.date, x.type, c.get(x.categoryId) ?? '', a.get(x.accountId) ?? '', toInputAmount(x.amount), x.note]);
            await shareTextFile(`transactions-all-${today()}.csv`, toCSV(['Date', 'Type', 'Category', 'Account', 'Amount', 'Note'], rows), 'text/csv');
          })}
        />
        <View style={{ height: 1, backgroundColor: t.border, marginVertical: 4 }} />
        <Button
          title="Load sample data"
          variant="secondary"
          icon="sparkles-outline"
          loading={busy === 'sample'}
          onPress={() => run('sample', async () => {
            const n = await loadSampleData();
            notify('Sample data added', `${n} transactions and starter budgets.`);
          })}
        />
        <Button
          title="Erase all data"
          variant="danger"
          onPress={() => run('reset', async () => {
            if (!(await confirm('Erase everything?', 'Deletes all transactions, budgets, accounts and settings. This cannot be undone.', 'Erase', true))) return;
            await resetAll();
          })}
        />
      </Section>
    </Screen>
  );
}

function PinSettings({ enabled }: { enabled: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');

  async function save() {
    if (!/^\d{4,8}$/.test(pin)) return setError('PIN must be 4–8 digits.');
    if (pin !== pin2) return setError('PINs do not match.');
    const salt = newSalt();
    await setSetting('pinSalt', salt);
    await setSetting('pinHash', await hashPin(pin, salt));
    setEditing(false);
    setPin('');
    setPin2('');
    setError('');
    notify('PIN lock enabled', 'You will be asked for it when the app starts.');
  }

  if (!editing) {
    return (
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T bold size={14}>{enabled ? 'PIN lock is on' : 'PIN lock is off'}</T>
          <T muted size={12}>Ask for a PIN when the app starts.</T>
        </View>
        <Button title={enabled ? 'Change' : 'Set PIN'} variant="secondary" onPress={() => setEditing(true)} style={{ paddingVertical: 8 }} />
        {enabled && (
          <Button
            title="Remove"
            variant="ghost"
            onPress={async () => {
              if (await confirm('Remove PIN lock?', 'The app will open without a PIN.', 'Remove', true)) await deleteSettings(['pinHash', 'pinSalt']);
            }}
            style={{ paddingVertical: 8 }}
          />
        )}
      </Row>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <Input label="New PIN" value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={8} />
      <Input label="Confirm PIN" value={pin2} onChangeText={(v) => setPin2(v.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={8} />
      <ErrorText>{error}</ErrorText>
      <Row>
        <Button title="Save PIN" onPress={save} style={{ flex: 1 }} />
        <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
      </Row>
    </View>
  );
}

function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  const { theme: t } = useSettings();
  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ gap: 8 }}>
        <Ionicons name={icon} size={18} color={t.primary} />
        <T bold>{title}</T>
      </Row>
      {children}
    </Card>
  );
}
