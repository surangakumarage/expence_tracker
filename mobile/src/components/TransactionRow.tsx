import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Account, Category, Transaction } from '../lib/types';
import { useSettings } from '../data/settings';
import { CategoryIcon } from './CategoryIcon';
import { T } from './ui';

export function TransactionRow({ tx, category, account, onPress }: { tx: Transaction; category?: Category; account?: Account; onPress?: () => void }) {
  const { fmt, theme: t } = useSettings();
  const income = tx.type === 'income';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
    >
      <CategoryIcon icon={category?.icon} color={category?.color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <T bold numberOfLines={1}>{category?.name ?? 'Uncategorized'}</T>
          {tx.recurringId != null && <Ionicons name="repeat" size={12} color={t.muted} />}
        </View>
        <T muted size={13} numberOfLines={1}>{[tx.note, account?.name].filter(Boolean).join(' · ')}</T>
      </View>
      <T bold color={income ? t.success : t.text}>{income ? '+' : '−'}{fmt(tx.amount)}</T>
    </Pressable>
  );
}
