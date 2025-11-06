import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@theme/index';

type Tone = 'info' | 'error';

type Props = {
  visible: boolean;
  message: string;
  tone?: Tone;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
};

const toneMap: Record<Tone, { colors: string[]; text: string }> = {
  info: {
    colors: ['#E0F2FE', '#BFDBFE'],
    text: theme.palette.titanium,
  },
  error: {
    colors: ['#FEE2E2', '#FCA5A5'],
    text: '#7F1D1D',
  },
};

export const MetalToast = memo(function MetalToast({
  visible,
  message,
  tone = 'info',
  actionLabel,
  onAction,
  onDismiss,
}: Props) {
  if (!visible) {
    return null;
  }

  const palette = toneMap[tone];

  return (
    <LinearGradient colors={palette.colors} style={styles.container} start={{ x: 0, y: 0 }}>
      <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
      {(actionLabel || onDismiss) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <Pressable onPress={onAction} style={styles.actionButton}>
              <Text style={[styles.actionText, { color: palette.text }]}>{actionLabel}</Text>
            </Pressable>
          )}
          {onDismiss && (
            <Pressable onPress={onDismiss} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: palette.text }]}>✕</Text>
            </Pressable>
          )}
        </View>
      )}
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.shadow.panel,
    marginBottom: theme.spacing.sm,
  },
  message: {
    ...theme.typography.body,
  },
  actions: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  actionButton: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
  },
  actionText: {
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
  },
  closeText: {
    fontSize: 14,
  },
});
