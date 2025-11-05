import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { theme } from '@theme/index';

export function MentorScreen() {
  const handleStartSession = useCallback(() => {
    // TODO: Integrate mentor session start via backend API
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headline}>Mentor Session</Text>
        <Text style={styles.subtitle}>
          Channel the Apple design spirit—polished, empathetic, unmistakably premium. Your
          mentor is moments away.
        </Text>

        <MetalPanel glow>
          <Text style={styles.panelTitle}>Daily Reflection</Text>
          <Text style={styles.body}>
            Prepare a short prompt for the mentor. Consider how you feel, what you hope to
            achieve today, and any small wins worth celebrating.
          </Text>
          <MetalButton title="Start Mentor Chat" onPress={handleStartSession} />
        </MetalPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  headline: {
    color: theme.palette.platinum,
    ...theme.typography.title,
  },
  subtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  panelTitle: {
    color: theme.palette.titanium,
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.md,
  },
  body: {
    color: theme.palette.titanium,
    ...theme.typography.body,
    marginBottom: theme.spacing.md,
  },
});
