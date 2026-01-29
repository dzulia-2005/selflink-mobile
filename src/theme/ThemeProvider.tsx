import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { themes, type Theme, type ThemeMode, type ThemeName } from './tokens';

const STORAGE_KEY = 'selflink.theme.mode';

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: ThemeName;
  theme: Theme;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveThemeName(mode: ThemeMode, systemScheme: ThemeName | null): ThemeName {
  if (mode === 'system') {
    return systemScheme ?? 'light';
  }
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() as ThemeName | null;
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!isMounted || !value) {
          return;
        }
        if (value === 'light' || value === 'dark' || value === 'system') {
          setModeState(value);
        }
      })
      .catch(() => undefined)
      .finally(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      // Trigger re-render for system changes
      setModeState((prev) => prev);
    });
    return () => subscription.remove();
  }, []);

  const resolved = resolveThemeName(mode, systemScheme);
  const theme = themes[resolved];

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // ignore storage errors
    }
  }, []);

  const value = useMemo(
    () => ({
      mode,
      resolved,
      theme,
      setMode,
    }),
    [mode, resolved, theme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
