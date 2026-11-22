import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../data/settings';
import { Card, Screen, T, type IconName } from '../../components/ui';

const ITEMS: { href: Href; label: string; hint: string; icon: IconName; color: string }[] = [
  { href: '/accounts', label: 'Accounts', hint: 'Cash, bank, cards and balances', icon: 'wallet', color: '#2563eb' },
  { href: '/recurring', label: 'Recurring', hint: 'Bills, subscriptions and salary', icon: 'repeat', color: '#8b5cf6' },
  { href: '/categories', label: 'Categories', hint: 'Icons and colors', icon: 'pricetags', color: '#f97316' },
  { href: '/settings', label: 'Settings', hint: 'Currency, theme, PIN, backup', icon: 'settings', color: '#64748b' },
];

export default function More() {
  const t = useTheme();
  return (
    <Screen>
      <Card style={{ paddingVertical: 4 }}>
        {ITEMS.map((it, i) => (
          <Pressable
            key={it.label}
            accessibilityRole="button"
            onPress={() => router.push(it.href)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderColor: t.border, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ backgroundColor: `${it.color}22`, borderRadius: 10, padding: 8 }}>
              <Ionicons name={it.icon} size={20} color={it.color} />
            </View>
            <View style={{ flex: 1 }}>
              <T bold>{it.label}</T>
              <T muted size={13}>{it.hint}</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.muted} />
          </Pressable>
        ))}
      </Card>
      <T muted size={12} style={{ textAlign: 'center' }}>Your data is stored only on this device.</T>
    </Screen>
  );
}
