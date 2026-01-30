import { useMemo } from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { useTheme } from '@theme';

type Props = TextProps & {
  muted?: boolean;
};

export function ThemedText({ style, muted = false, ...rest }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        text: {
          color: muted ? theme.text.muted : theme.text.primary,
        },
      }),
    [muted, theme],
  );

  return <Text {...rest} style={[styles.text, style]} />;
}
