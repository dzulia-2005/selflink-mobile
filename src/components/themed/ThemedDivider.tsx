import { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '@theme';

type Props = {
  style?: ViewStyle;
};

export function ThemedDivider({ style }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.border,
        },
      }),
    [theme],
  );

  return <View style={[styles.divider, style]} />;
}
