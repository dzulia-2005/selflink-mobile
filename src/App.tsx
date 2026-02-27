import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuthProvider } from '@context/AuthContext';
import { ToastProvider } from '@context/ToastContext';
import { bootstrapI18n } from '@i18n';
import { RootNavigator } from '@navigation/RootNavigator';
import { ThemeProvider, useTheme } from '@theme';

function AppShell() {
  const { t } = useTranslation();
  const { resolved, theme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  const statusBarStyle = useMemo(
    () => (resolved === 'light' ? 'dark' : 'light'),
    [resolved],
  );

  const prepare = useCallback(async () => {
    await bootstrapI18n();
    setIsReady(true);
  }, []);

  useEffect(() => {
    prepare().catch(() => undefined);
  }, [prepare]);

  if (!isReady) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.colors.background }]}>
        <StatusBar style={statusBarStyle} backgroundColor={theme.colors.background} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.splashText, { color: theme.text.primary }]}>
          {t('splash.loading')}
        </Text>
      </View>
    );
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
    <AuthProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  splashText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
