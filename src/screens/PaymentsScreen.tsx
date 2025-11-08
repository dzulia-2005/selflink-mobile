import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { usePaymentsCatalog } from '@hooks/usePaymentsCatalog';
import { theme } from '@theme/index';

export function PaymentsScreen() {
  const { gifts, plans, activeSubscription, loading, refresh } = usePaymentsCatalog();

  const handleOpenSubscription = useCallback(() => {
    // TODO: Launch Stripe Checkout via backend session
  }, []);

  const handleOpenWallet = useCallback(() => {
    // TODO: Navigate to wallet ledger once API is wired
  }, []);

  const planFeatureMap = useMemo(
    () =>
      new Map(
        plans.map((plan) => [
          plan.id,
          Object.entries(plan.features ?? {}).map(
            ([key, value]) => `${key}: ${String(value)}`,
          ),
        ]),
      ),
    [plans],
  );

  const formatPrice = useCallback((cents: number, interval?: string) => {
    const dollars = (cents / 100).toFixed(2);
    return `$${dollars}${interval ? ` / ${interval}` : ''}`;
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
          <Text style={styles.panelTitle}>Membership Status</Text>
          {activeSubscription ? (
            <>
              <Text style={styles.body}>
                You&apos;re on <Text style={styles.emphasis}>{activeSubscription.plan.name}</Text>{' '}
                ({formatPrice(activeSubscription.plan.price_cents, activeSubscription.plan.interval)}).
              </Text>
              <Text style={styles.caption}>
                Current period ends {new Date(
                  activeSubscription.current_period_end ?? activeSubscription.updated_at,
                ).toLocaleDateString()}
              </Text>
            </>
          ) : (
            <Text style={styles.body}>
              No active plan yet. As Steve would say: the experience begins the moment you
              tap &quot;Subscribe&quot;.
            </Text>
          )}
          <View style={styles.buttonRow}>
            <MetalButton title="Refresh Catalog" onPress={refresh} />
            <MetalButton title="Manage Subscription" onPress={handleOpenSubscription} />
          </View>
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.panelTitle}>Available Plans</Text>
          {plans.length === 0 ? (
            <Text style={styles.body}>Plans will appear here once the backend seeds them.</Text>
          ) : (
            plans.map((plan) => (
              <View key={plan.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{plan.name}</Text>
                  <Text style={styles.cardPrice}>
                    {formatPrice(plan.price_cents, plan.interval)}
                  </Text>
                </View>
                {(planFeatureMap.get(plan.id) ?? []).map((feature) => (
                  <Text key={feature} style={styles.feature}>
                    • {feature}
                  </Text>
                ))}
                <MetalButton title="Select Plan" onPress={handleOpenSubscription} />
              </View>
            ))
          )}
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.panelTitle}>Gift Catalog</Text>
          {gifts.length === 0 ? (
            <Text style={styles.body}>
              Gifts are the playful, Musk-level audacity we&apos;ll add soon.
            </Text>
          ) : (
            gifts.map((gift) => (
              <View key={gift.id} style={styles.card}>
                <Text style={styles.cardTitle}>{gift.name}</Text>
                <Text style={styles.cardPrice}>{formatPrice(gift.price_cents)}</Text>
                {gift.metadata ? (
                  <Text style={styles.feature}>
                    {Object.entries(gift.metadata)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(' · ')}
                  </Text>
                ) : null}
                <MetalButton title="Send Gift" onPress={handleOpenWallet} />
              </View>
            ))
          )}
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.panelTitle}>Wallet</Text>
          <Text style={styles.body}>
            Soon: monitor balances, gifts, and transaction history with a Torvalds-approved
            clarity.
          </Text>
          <MetalButton title="View Wallet" onPress={handleOpenWallet} />
        </MetalPanel>
      </ScrollView>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={theme.palette.platinum} />
        </View>
      ) : null}
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
  emphasis: {
    color: theme.palette.platinum,
    fontWeight: '600',
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
  caption: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    marginBottom: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.palette.graphite,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.palette.obsidian,
    gap: theme.spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
  cardPrice: {
    color: theme.palette.azure,
    ...theme.typography.subtitle,
  },
  feature: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.palette.midnight + '90',
  },
});
