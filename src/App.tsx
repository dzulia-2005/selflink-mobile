import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ToastProvider } from '@context/ToastContext';
import { RootNavigator } from '@navigation/RootNavigator';
import { ThemeProvider, useTheme } from '@theme';

function AppShell() {
  const { resolved, theme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  const statusBarStyle = useMemo(
    () => (resolved === 'light' ? 'dark' : 'light'),
    [resolved],
  );

  const prepare = useCallback(async () => {
    // Placeholder for font loading or splash preparation
    setIsReady(true);
  }, []);

  useEffect(() => {
    prepare().catch(() => undefined);
  }, [prepare]);

  if (!isReady) {
    return <StatusBar style={statusBarStyle} backgroundColor={theme.colors.background} />;
  }

  return (
    <ToastProvider>
      <StatusBar style={statusBarStyle} backgroundColor={theme.colors.background} />
      <RootNavigator />
    </ToastProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
