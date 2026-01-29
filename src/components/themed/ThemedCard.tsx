import { useMemo } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { useTheme } from '@theme';

export function ThemedCard({ style, ...rest }: ViewProps) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
      }),
    [theme],
  );

  return <View {...rest} style={[styles.card, style]} />;
}
