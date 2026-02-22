import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CoinProduct,
  getCoinProducts,
  getSlcBalance,
  normalizeCoinApiError,
  purchaseWithSlc,
} from '@api/coin';
import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import { usePaymentsCatalog } from '@hooks/usePaymentsCatalog';
import type { ProfileStackParamList } from '@navigation/types';
import { useEntitlementsStore } from '@store/entitlementsStore';
import { useTheme, type Theme } from '@theme';

type PaymentsNavigation = NativeStackNavigationProp<ProfileStackParamList, 'Payments'>;

export function PaymentsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<PaymentsNavigation>();
  const { gifts, loading, refresh } = usePaymentsCatalog();
  const toast = useToast();
  const entitlements = useEntitlementsStore((state) => state.entitlements);
  const fetchEntitlements = useEntitlementsStore((state) => state.fetchEntitlements);
  const setEntitlements = useEntitlementsStore((state) => state.setEntitlements);
  const [products, setProducts] = useState<CoinProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [slcBalance, setSlcBalance] = useState<number | null>(null);
  const [purchasingCode, setPurchasingCode] = useState<string | null>(null);
  const [purchaseErrorCode, setPurchaseErrorCode] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const [fetchedProducts, balance] = await Promise.all([
        getCoinProducts(),
        getSlcBalance().catch(() => null),
      ]);
      setProducts(fetchedProducts);
      setSlcBalance(balance?.balance_cents ?? null);
    } catch (error) {
      setProductsError('Unable to load SLC products.');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const handleOpenWallet = useCallback(() => {
    navigation.navigate('WalletLedger');
  }, [navigation]);

  const formatPrice = useCallback((cents: number, interval?: string) => {
    const dollars = (cents / 100).toFixed(2);
    return `$${dollars}${interval ? ` / ${interval}` : ''}`;
  }, []);

  const formatSlc = useCallback((cents: number) => {
    const dollars = (cents / 100).toFixed(2);
    return `${dollars} SLC`;
  }, []);

  const handlePurchase = useCallback(
    async (product: CoinProduct) => {
      if (purchasingCode) {
        return;
      }
      setPurchaseErrorCode(null);
      setPurchasingCode(product.code);
      try {
        const idempotencyKey = `slc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const result = await purchaseWithSlc({
          product_code: product.code,
          quantity: 1,
          idempotency_key: idempotencyKey,
        });
        setEntitlements(result.entitlements);
        await loadProducts();
        toast.push({ tone: 'info', message: 'Purchase successful.' });
      } catch (error) {
        const normalized = normalizeCoinApiError(error, 'Unable to complete purchase.');
        setPurchaseErrorCode(normalized.code ?? null);
        toast.push({ tone: 'error', message: normalized.message, duration: 4000 });
      } finally {
        setPurchasingCode(null);
      }
    },
    [loadProducts, purchasingCode, setEntitlements, toast],
  );

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([refresh(), loadProducts(), fetchEntitlements().catch(() => null)]);
  }, [fetchEntitlements, loadProducts, refresh]);

  useEffect(() => {
    loadProducts().catch(() => undefined);
  }, [loadProducts]);

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
          {entitlements?.premium_plus?.active ? (
            <Text style={styles.body}>Premium+ is active.</Text>
          ) : entitlements?.premium?.active ? (
            <Text style={styles.body}>Premium is active.</Text>
          ) : (
            <Text style={styles.body}>No active membership yet.</Text>
          )}
          {entitlements?.premium?.active_until ? (
            <Text style={styles.caption}>
              Premium expires{' '}
              {new Date(entitlements.premium.active_until).toLocaleDateString()}
            </Text>
          ) : null}
          {entitlements?.premium_plus?.active_until ? (
            <Text style={styles.caption}>
              Premium+ expires{' '}
              {new Date(entitlements.premium_plus.active_until).toLocaleDateString()}
            </Text>
          ) : null}
          <View style={styles.buttonRow}>
            <MetalButton title="Refresh Status" onPress={handleRefreshAll} />
            <MetalButton title="Top up SLC" onPress={handleOpenWallet} />
          </View>
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.panelTitle}>Buy with SLC</Text>
          {productsLoading ? (
            <Text style={styles.body}>Loading SLC products…</Text>
          ) : productsError ? (
            <Text style={styles.body}>{productsError}</Text>
          ) : products.length === 0 ? (
            <Text style={styles.body}>No SLC products available yet.</Text>
          ) : (
            products.map((product) => (
              <View key={product.code} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{product.title}</Text>
                  <Text style={styles.cardPrice}>{formatSlc(product.price_slc)}</Text>
                </View>
                {product.description ? (
                  <Text style={styles.body}>{product.description}</Text>
                ) : null}
                <MetalButton
                  title={
                    purchasingCode === product.code ? 'Processing…' : 'Buy with SLC'
                  }
                  onPress={() => handlePurchase(product)}
                  disabled={purchasingCode === product.code}
                />
              </View>
            ))
          )}
          {slcBalance !== null ? (
            <Text style={styles.caption}>Your SLC balance: {formatSlc(slcBalance)}</Text>
          ) : null}
        </MetalPanel>

        {purchaseErrorCode === 'insufficient_funds' ? (
          <MetalPanel>
            <Text style={styles.body}>
              Insufficient SLC balance. Top up to unlock Premium features.
            </Text>
            <MetalButton title="Top up SLC" onPress={handleOpenWallet} />
          </MetalPanel>
        ) : null}

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
            Soon: monitor balances, gifts, and transaction history with a
            Torvalds-approved clarity.
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
