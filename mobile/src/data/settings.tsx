import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getSettings, useQuery } from './db';
import { formatMoney } from '../lib/format';
import { dark, light, type Theme } from '../theme';

interface SettingsValue {
  ready: boolean;
  settings: Record<string, string>;
  currency: string;
  fmt: (minor: number) => string;
  theme: Theme;
  themePref: 'system' | 'light' | 'dark';
}

const Ctx = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useQuery(getSettings);
  const system = useColorScheme();
  const value = useMemo<SettingsValue>(() => {
    const s = settings ?? {};
    const currency = s.currency ?? 'USD';
    const themePref = (s.theme as SettingsValue['themePref']) ?? 'system';
    const isDark = themePref === 'dark' || (themePref === 'system' && system === 'dark');
    return {
      ready: settings != null,
      settings: s,
      currency,
      fmt: (minor: number) => formatMoney(minor, currency),
      theme: isDark ? dark : light,
      themePref,
    };
  }, [settings, system]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings must be used inside SettingsProvider');
  return v;
}

export const useTheme = () => useSettings().theme;
