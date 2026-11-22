import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useCategories } from '../data/hooks';
import type { TxType } from '../lib/types';
import { CategoryIcon } from '../components/CategoryIcon';
import { Button, Card, Screen, Segmented, T } from '../components/ui';

export default function Categories() {
  const { list } = useCategories();
  const [kind, setKind] = useState<TxType>('expense');
  return (
    <Screen>
      <Segmented value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {list.filter((c) => c.kind === kind).map((c) => (
          <Pressable key={c.id} style={{ width: '48%', flexGrow: 1 }} onPress={() => router.push({ pathname: '/category-edit', params: { id: String(c.id) } })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
              <CategoryIcon icon={c.icon} color={c.color} size={34} />
              <T bold size={14} numberOfLines={1} style={{ flex: 1 }}>{c.name}</T>
            </Card>
          </Pressable>
        ))}
      </View>
      <Button title="New category" icon="add" onPress={() => router.push({ pathname: '/category-edit', params: { kind } })} />
    </Screen>
  );
}
