import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listTransactions, useQuery } from '../data/db';
import { useAccounts } from '../data/hooks';
import { useSettings } from '../data/settings';
import { accountBalances } from '../lib/stats';
import { ACCOUNT_TYPES } from '../components/accountTypes';
import { Button, Card, Row, Screen, T } from '../components/ui';

export default function Accounts() {
  const { fmt, theme: t } = useSettings();
  const { list } = useAccounts();
  const txs = useQuery(() => listTransactions()) ?? [];
  const bal = accountBalances(list, txs);
  const total = list.filter((a) => !a.archived).reduce((s, a) => s + (bal.get(a.id!) ?? 0), 0);

  return (
    <Screen>
      <Card>
        <T muted size={13}>Total balance</T>
        <T bold size={26}>{fmt(total)}</T>
      </Card>
      {list.map((a) => {
        const b = bal.get(a.id!) ?? 0;
        return (
          <Pressable key={a.id} onPress={() => router.push({ pathname: '/account-edit', params: { id: String(a.id) } })}>
            <Card style={{ opacity: a.archived ? 0.5 : 1 }}>
              <Row>
                <View style={{ backgroundColor: `${a.color}22`, borderRadius: 12, padding: 10 }}>
                  <Ionicons name={ACCOUNT_TYPES[a.type].icon} size={22} color={a.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <T bold>{a.name}</T>
                  <T muted size={12}>{ACCOUNT_TYPES[a.type].label}{a.archived ? ' · archived' : ''}</T>
                </View>
                <T bold size={17} color={b < 0 ? t.danger : t.text}>{fmt(b)}</T>
              </Row>
            </Card>
          </Pressable>
        );
      })}
      <Button title="New account" icon="add" onPress={() => router.push('/account-edit')} />
    </Screen>
  );
}
