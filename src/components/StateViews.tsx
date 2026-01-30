import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@theme';

export function LoadingView({ message }: { message?: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

export function ErrorView({
  message = 'Something went wrong.',
  actionLabel = 'Retry',
  onRetry,
}: {
  message?: string;
  actionLabel?: string;
  onRetry?: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.centered}>
      <Text style={[styles.text, styles.errorText]}>{message}</Text>
      {onRetry ? (
        <Text style={styles.link} onPress={onRetry}>
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  text: {
    color: theme.text.primary,
    ...theme.typography.body,
    textAlign: 'center',
  },
  errorText: {
    color: theme.colors.error,
  },
  link: {
    color: theme.colors.primary,
    ...theme.typography.button,
  },
  });
