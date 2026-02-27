import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@theme';

export function LoadingView({ message }: { message?: string }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const resolvedMessage = message ?? t('common.loading');
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>{resolvedMessage}</Text>
    </View>
  );
}

export function ErrorView({
  message,
  actionLabel,
  onRetry,
}: {
  message?: string;
  actionLabel?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const resolvedMessage = message ?? t('common.error.defaultMessage');
  const resolvedActionLabel = actionLabel ?? t('common.retry');
  return (
    <View style={styles.centered}>
      <Text style={[styles.text, styles.errorText]}>{resolvedMessage}</Text>
      {onRetry ? (
        <Text style={styles.link} onPress={onRetry}>
          {resolvedActionLabel}
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
