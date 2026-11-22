import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { listRecurring, processRecurring, saveRecurring, useQuery } from '../data/db';
import { useAccounts, useCategories } from '../data/hooks';
import { useSettings } from '../data/settings';
import { dayLabel, today } from '../lib/format';
import { FREQUENCY_LABEL } from '../lib/recurring';
import type { Frequency, Recurring } from '../lib/types';
import { CategoryIcon } from '../components/CategoryIcon';
import { Button, Card, EmptyState, IconButton, Row, Screen, T } from '../components/ui';

const MONTHLY_FACTOR: Record<Frequency, number> = { daily: 30.44, weekly: 4.345, monthly: 1, yearly: 1 / 12 };

export default function RecurringList() {
  const { fmt, theme: t } = useSettings();
  const { byId: cats } = useCategories();
  const { byId: accs } = useAccounts();
  const rules = useQuery(listRecurring);
  if (!rules) return <Screen><View /></Screen>;

  const active = rules.filter((r) => r.active);
  const monthly = (type: Recurring['type']) =>
    Math.round(active.filter((r) => r.type === type).reduce((s, r) => s + r.amount * MONTHLY_FACTOR[r.frequency], 0));

  async function toggle(r: Recurring) {
    const { id, ...rest } = r;
    await saveRecurring({ ...rest, active: !r.active, nextDate: !r.active && r.nextDate < today() ? today() : r.nextDate }, id);
    if (!r.active) await processRecurring();
  }

  return (
    <Screen>
      <Row style={{ gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <T muted size={12}>Monthly fixed costs</T>
          <T bold size={17} color={t.danger}>{fmt(monthly('expense'))}</T>
        </Card>
        <Card style={{ flex: 1 }}>
          <T muted size={12}>Monthly recurring income</T>
          <T bold size={17} color={t.success}>{fmt(monthly('income'))}</T>
        </Card>
      </Row>
      <Card style={{ paddingVertical: 4 }}>
        {rules.length === 0 ? (
          <EmptyState icon="repeat" title="No recurring transactions" hint="Add rent, subscriptions or salary once and they'll be recorded automatically on each due date." />
        ) : (
          rules.map((r, i) => {
            const c = cats.get(r.categoryId);
            return (
              <Row key={r.id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: t.border, opacity: r.active ? 1 : 0.5 }}>
                <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => router.push({ pathname: '/recurring-edit', params: { id: String(r.id) } })}>
                  <CategoryIcon icon={c?.icon} color={c?.color} />
                  <View style={{ flex: 1 }}>
                    <T bold numberOfLines={1}>{r.note || c?.name}</T>
                    <T muted size={12} numberOfLines={1}>
                      {FREQUENCY_LABEL[r.frequency]} · {accs.get(r.accountId)?.name} · {r.active ? `next ${dayLabel(r.nextDate)}` : 'paused'}
                    </T>
                  </View>
                  <T bold color={r.type === 'income' ? t.success : t.text}>{r.type === 'income' ? '+' : '−'}{fmt(r.amount)}</T>
                </Pressable>
                <IconButton icon={r.active ? 'pause' : 'play'} label={r.active ? 'Pause' : 'Resume'} size={18} color={t.muted} onPress={() => toggle(r)} />
              </Row>
            );
          })
        )}
      </Card>
      <Button title="New recurring rule" icon="add" onPress={() => router.push('/recurring-edit')} />
    </Screen>
  );
}
