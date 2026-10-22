import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';

import { Palettes, type Palette } from '@/constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';
const KEY = 'dn.theme';

interface ThemeState {
  preference: ThemePreference;
  scheme: 'light' | 'dark';
  colors: Palette;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemScheme();
  const [preference, setPref] = useState<ThemePreference>('system');
  // Static web rendering has no colour scheme; wait for the client before trusting it.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      .catch(() => {});
  }, []);

  const scheme = preference === 'system' ? (hydrated && system === 'dark' ? 'dark' : 'light') : preference;
  const value: ThemeState = {
    preference,
    scheme,
    colors: Palettes[scheme],
    setPreference: (p) => {
      setPref(p);
      AsyncStorage.setItem(KEY, p).catch(() => {});
    },
  };
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useAppTheme(): ThemeState {
  const ctx = use(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return ctx;
}
