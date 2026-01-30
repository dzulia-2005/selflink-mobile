import { memo, useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '@theme';

type Props = {
  status: 'online' | 'offline' | 'loading' | 'idle';
  label?: string;
  style?: ViewStyle;
};

const statusText: Record<Props['status'], string> = {
  idle: 'Idle',
  loading: 'Checking…',
  online: 'Online',
  offline: 'Offline',
};

export const StatusPill = memo(function StatusPill({ status, label, style }: Props) {
  const { theme } = useTheme();
  const statusColors = useMemo(
    () => ({
      idle: theme.palette.platinum,
      loading: theme.palette.glow,
      online: theme.palette.lime,
      offline: theme.palette.ember,
    }),
    [theme],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.palette.titanium,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          gap: theme.spacing.xs,
        },
        dot: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        text: {
          color: theme.palette.platinum,
          fontSize: 13,
          fontWeight: '500',
          letterSpacing: 0.2,
        },
      }),
    [theme],
  );

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.dot, { backgroundColor: statusColors[status] }]} />
      <Text style={styles.text}>{label ?? statusText[status]}</Text>
    </View>
  );
});
