import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { theme } from '@theme/index';

export function PaymentsScreen() {
  const handleOpenSubscription = useCallback(() => {
    // TODO: Launch Stripe Checkout via backend session
  }, []);

  const handleOpenWallet = useCallback(() => {
    // TODO: Navigate to wallet ledger once API is wired
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headline}>Payments & Membership</Text>
        <Text style={styles.subtitle}>
          Mirror the precision of Apple Pay—clean cards, soft highlights, friendly copy.
          Stripe integration will power the real flow.
        </Text>

        <MetalPanel glow>
          <Text style={styles.panelTitle}>Premium Plan</Text>
          <Text style={styles.body}>
            Unlock extended mentor sessions, deeper SoulMatch analytics, and priority
            messaging. All wrapped in thoughtful, human design.
          </Text>
          <MetalButton title="Open Checkout" onPress={handleOpenSubscription} />
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.panelTitle}>Wallet</Text>
          <Text style={styles.body}>
            Soon: monitor balances, gifts, and transaction history.
          </Text>
          <MetalButton title="View Wallet" onPress={handleOpenWallet} />
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
