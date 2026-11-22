import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDb, processRecurring } from '../data/db';
import { SettingsProvider, useSettings } from '../data/settings';
import { LockScreen } from '../components/LockScreen';
import { T } from '../components/ui';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDb().then(() => setReady(true), (e) => setError(String(e)));
  }, []);

  // Catch up recurring transactions when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && ready && processRecurring());
    return () => sub.remove();
  }, [ready]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <T bold>Could not open the database</T>
        <T muted>{error}</T>
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AppShell />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { ready, settings, theme: t } = useSettings();
  const [unlocked, setUnlocked] = useState(false);

  if (!ready) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (settings.pinHash && !unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

  const modal = { presentation: 'modal' as const };
  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="transaction" options={{ ...modal, title: 'Transaction' }} />
        <Stack.Screen name="recurring-edit" options={{ ...modal, title: 'Recurring rule' }} />
        <Stack.Screen name="account-edit" options={{ ...modal, title: 'Account' }} />
        <Stack.Screen name="category-edit" options={{ ...modal, title: 'Category' }} />
        <Stack.Screen name="accounts" options={{ title: 'Accounts' }} />
        <Stack.Screen name="categories" options={{ title: 'Categories' }} />
        <Stack.Screen name="recurring" options={{ title: 'Recurring' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}
