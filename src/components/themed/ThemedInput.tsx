import { useMemo } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';

import { useTheme } from '@theme';

export function ThemedInput({ style, placeholderTextColor, ...rest }: TextInputProps) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        input: {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          color: theme.text.primary,
        },
      }),
    [theme],
  );

  return (
    <TextInput
      {...rest}
      style={[styles.input, style]}
      placeholderTextColor={placeholderTextColor ?? theme.text.muted}
    />
  );
}
