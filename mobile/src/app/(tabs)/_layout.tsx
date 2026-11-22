import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../data/settings';

function tabIcon(name: ComponentProps<typeof Ionicons>['name']) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };
}

export default function TabsLayout() {
  const t = useTheme();
  const addButton = () => (
    <Pressable accessibilityLabel="Add transaction" hitSlop={10} onPress={() => router.push('/transaction')} style={{ marginRight: 16 }}>
      <Ionicons name="add-circle" size={30} color={t.primary} />
    </Pressable>
  );
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.card },
        headerTintColor: t.text,
        headerShadowVisible: false,
        headerRight: addButton,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: tabIcon('grid') }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions', tabBarIcon: tabIcon('swap-vertical') }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets', tabBarIcon: tabIcon('pie-chart') }} />
      <Tabs.Screen name="more" options={{ title: 'More', headerRight: undefined, tabBarIcon: tabIcon('menu') }} />
    </Tabs>
  );
}
