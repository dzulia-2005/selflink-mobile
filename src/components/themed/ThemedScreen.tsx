import { useMemo } from 'react';
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native';

import { useTheme } from '@theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function ThemedScreen({ children, style }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
      }),
    [theme],
  );

  return <SafeAreaView style={[styles.container, style]}>{children}</SafeAreaView>;
}
