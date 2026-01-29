import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@theme';

export function SocialLoginScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Social login</Text>
      <Text style={styles.subtitle}>
        Connect Google, Facebook, or GitHub to continue. Coming soon.
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text.primary,
      marginBottom: 8,
    },
    subtitle: {
      color: theme.text.muted,
      textAlign: 'center',
    },
  });
