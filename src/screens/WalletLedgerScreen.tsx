import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { EmptyState } from '@components/EmptyState';
import { ErrorState } from '@components/ErrorState';
import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import { useAuthStore } from '@store/authStore';
import {
  SlcBalance,
  SlcLedgerEntry,
  getSlcBalance,
  listSlcLedger,
  normalizeCoinApiError,
  spendSlc,
  transferSlc,
} from '@api/coin';
import { createIpayCheckout } from '@api/ipay';
import { getWallet, Wallet } from '@services/api/payments';
import { env } from '@config/env';
import { theme } from '@theme/index';
import { parseDollarsToCents } from '@utils/currency';
import { createIpayPollSession, shouldCompleteIpayPolling } from '@utils/ipayPolling';

import { COIN_SPEND_REFERENCES } from '../constants/coinSpendReferences';

const LEDGER_PAGE_SIZE = 25;
const IPAY_CURRENCIES = ['USD', 'EUR', 'GEL'] as const;
type IpayCurrency = (typeof IPAY_CURRENCIES)[number];
const IPAY_REFERENCE_PARAM = 'reference';

type ParsedApiError = {
  message: string;
  status?: number;
  code?: string;
};

const formatDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const defaultSpendReference =
  COIN_SPEND_REFERENCES.length > 0 ? COIN_SPEND_REFERENCES[0].value : '';

const buildIpayCheckoutUrl = (baseUrl: string, reference: string) => {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const url = new URL(trimmed);
    url.searchParams.set(IPAY_REFERENCE_PARAM, reference);
    return url.toString();
  } catch {
    const separator = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${separator}${IPAY_REFERENCE_PARAM}=${encodeURIComponent(
      reference,
    )}`;
  }
};

const extractDetailMessage = (payload: unknown): string | null => {
  if (!payload) {
    return null;
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (typeof payload !== 'object') {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === 'string') {
    return record.detail;
  }
  for (const value of Object.values(record)) {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
  }
  return null;
};

const parseApiError = (error: unknown): ParsedApiError => {
  if (error instanceof Error) {
    const match = error.message.match(/Request failed \\((\\d+)\\):\\s*(.*)$/);
    if (match) {
      const status = Number(match[1]);
      const rawBody = match[2];
      let parsedBody: unknown = rawBody;
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : rawBody;
      } catch {
        parsedBody = rawBody;
      }
      const message = extractDetailMessage(parsedBody) || rawBody || error.message;
      const code =
        typeof parsedBody === 'object' && parsedBody
          ? (parsedBody as { code?: string }).code
          : undefined;
      return { message, status, code };
    }
    return { message: error.message };
  }
  return { message: 'Unexpected error' };
};

const isAuthStatus = (status?: number) => status === 401 || status === 403;

const normalizeWalletError = (
  error: unknown,
  fallback: string,
): ParsedApiError => {
  const parsed = parseApiError(error);
  let message = parsed.message || fallback;
  if (isAuthStatus(parsed.status)) {
    message = 'Please sign in to continue.';
  } else if (!parsed.status && /network|failed to fetch/i.test(message)) {
    message = 'Unable to reach the server. Please try again.';
  }
  return { ...parsed, message };
};

const formatLedgerAmount = (entry: SlcLedgerEntry) => {
  const isCredit = entry.direction === 'CREDIT';
  const signed = isCredit ? entry.amount_cents : -entry.amount_cents;
  const prefix = signed >= 0 ? '+' : '-';
  return `${prefix}${formatDollars(Math.abs(signed))}`;
};

const formatLedgerTitle = (entry: SlcLedgerEntry) => {
  const eventType = entry.event_type?.toLowerCase();
  if (eventType === 'transfer') {
    return entry.direction === 'DEBIT' ? 'Sent SLC' : 'Received SLC';
  }
  if (eventType === 'spend') {
    return 'Spent SLC';
  }
  if (eventType === 'mint') {
    return 'Minted SLC';
  }
  if (eventType === 'refund') {
    return 'Refunded SLC';
  }
  return 'SLC Activity';
};

const formatCounterparty = (entry: SlcLedgerEntry) => {
  const eventType = entry.event_type?.toLowerCase();
  const metadata = entry.event_metadata ?? {};
  const toUserId =
    typeof metadata.to_user_id === 'number' ? metadata.to_user_id : undefined;
  const senderUserId =
    typeof metadata.sender_user_id === 'number' ? metadata.sender_user_id : undefined;
  const reference =
    typeof metadata.reference === 'string' ? metadata.reference : undefined;
  const provider =
    typeof metadata.provider === 'string' ? metadata.provider : undefined;

  if (eventType === 'transfer') {
    if (entry.direction === 'DEBIT' && toUserId) {
      return `To user #${toUserId}`;
    }
    if (entry.direction === 'CREDIT' && senderUserId) {
      return `From user #${senderUserId}`;
    }
    if (toUserId) {
      return `To user #${toUserId}`;
    }
    if (senderUserId) {
      return `From user #${senderUserId}`;
    }
  }

  if (eventType === 'spend' && reference) {
    return `Reference: ${reference}`;
  }

  if (eventType === 'mint' && provider) {
    return `Minted via ${provider}`;
  }

  return 'Account activity';
};

const formatTimestamp = (raw: string) => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString();
};

export function WalletLedgerScreen() {
  const toast = useToast();
  const logout = useAuthStore((state) => state.logout);
  const authHandledRef = useRef(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [coinBalance, setCoinBalance] = useState<SlcBalance | null>(null);
  const [coinLoading, setCoinLoading] = useState(true);
  const [coinError, setCoinError] = useState<string | null>(null);

  const [ledgerEntries, setLedgerEntries] = useState<SlcLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const ledgerRequestId = useRef(0);

  const [sendVisible, setSendVisible] = useState(false);
  const [recipientInput, setRecipientInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [throttleUntil, setThrottleUntil] = useState<number | null>(null);

  const [spendVisible, setSpendVisible] = useState(false);
  const [spendAmountInput, setSpendAmountInput] = useState('');
  const [spendNoteInput, setSpendNoteInput] = useState('');
  const [spendReference, setSpendReference] = useState(defaultSpendReference);
  const [spendError, setSpendError] = useState<string | null>(null);
  const [spendFieldErrors, setSpendFieldErrors] = useState<
    Record<string, string[]> | null
  >(null);
  const [spending, setSpending] = useState(false);
  const [spendThrottleUntil, setSpendThrottleUntil] = useState<number | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [ipayVisible, setIpayVisible] = useState(false);
  const [ipayAmountInput, setIpayAmountInput] = useState('');
  const [ipayCurrency, setIpayCurrency] = useState<IpayCurrency>(
    IPAY_CURRENCIES[0],
  );
  const [ipayError, setIpayError] = useState<string | null>(null);
  const [ipayFieldErrors, setIpayFieldErrors] = useState<
    Record<string, string[]> | null
  >(null);
  const [ipayLoading, setIpayLoading] = useState(false);
  const [pendingIpayReference, setPendingIpayReference] = useState<string | null>(
    null,
  );
  const [pendingIpayBalance, setPendingIpayBalance] = useState<number | null>(
    null,
  );
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const ipayPollSessionRef = useRef(createIpayPollSession());

  const isThrottled = throttleUntil !== null;
  const isSpendThrottled = spendThrottleUntil !== null;

  useEffect(() => {
    if (!throttleUntil) {
      return;
    }
    const delay = throttleUntil - Date.now();
    if (delay <= 0) {
      setThrottleUntil(null);
      return;
    }
    const timer = setTimeout(() => setThrottleUntil(null), delay);
    return () => clearTimeout(timer);
  }, [throttleUntil]);

  useEffect(() => {
    if (!spendThrottleUntil) {
      return;
    }
    const delay = spendThrottleUntil - Date.now();
    if (delay <= 0) {
      setSpendThrottleUntil(null);
      return;
    }
    const timer = setTimeout(() => setSpendThrottleUntil(null), delay);
    return () => clearTimeout(timer);
  }, [spendThrottleUntil]);

  const handleAuthError = useCallback(
    (message?: string) => {
      if (authHandledRef.current) {
        return;
      }
      authHandledRef.current = true;
      toast.push({
        tone: 'error',
        message: message ?? 'Session expired. Please sign in again.',
      });
      logout().catch(() => undefined);
    },
    [logout, toast],
  );

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const data = await getWallet();
      setWallet(data);
    } catch (error) {
      const normalized = normalizeWalletError(error, 'Unable to load wallet balance.');
      if (isAuthStatus(normalized.status)) {
        handleAuthError(normalized.message);
      }
      setWalletError(normalized.message);
    } finally {
      setWalletLoading(false);
    }
  }, [handleAuthError]);

  const fetchCoinBalance = useCallback(async () => {
    setCoinLoading(true);
    setCoinError(null);
    try {
      const data = await getSlcBalance();
      setCoinBalance(data);
    } catch (error) {
      const normalized = normalizeCoinApiError(error, 'Unable to load SLC balance.');
      if (isAuthStatus(normalized.status)) {
        handleAuthError(normalized.message);
      }
      setCoinError(normalized.message);
    } finally {
      setCoinLoading(false);
    }
  }, [handleAuthError]);

  const fetchLedger = useCallback(async () => {
    const requestId = ledgerRequestId.current + 1;
    ledgerRequestId.current = requestId;
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const data = await listSlcLedger({ limit: LEDGER_PAGE_SIZE });
      if (ledgerRequestId.current !== requestId) {
        return;
      }
      setLedgerEntries(data.results);
      setNextCursor(data.next_cursor || null);
    } catch (error) {
      if (ledgerRequestId.current !== requestId) {
        return;
      }
      const normalized = normalizeCoinApiError(error, 'Unable to load SLC activity.');
      if (isAuthStatus(normalized.status)) {
        handleAuthError(normalized.message);
      }
      setLedgerError(normalized.message);
    } finally {
      if (ledgerRequestId.current === requestId) {
        setLedgerLoading(false);
      }
    }
  }, [handleAuthError]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || ledgerLoading || refreshing) {
      return;
    }
    const requestId = ledgerRequestId.current;
    setLoadingMore(true);
    try {
      const data = await listSlcLedger({
        cursor: nextCursor,
        limit: LEDGER_PAGE_SIZE,
      });
      if (ledgerRequestId.current !== requestId) {
        return;
      }
      setLedgerEntries((prev) => [...prev, ...data.results]);
      setNextCursor(data.next_cursor || null);
    } catch (error) {
      if (ledgerRequestId.current !== requestId) {
        return;
      }
      const normalized = normalizeCoinApiError(error, 'Unable to load more activity.');
      if (normalized.status === 400 && /invalid cursor/i.test(normalized.message)) {
        setNextCursor(null);
        toast.push({
          tone: 'error',
          message: 'Activity refreshed due to an invalid cursor.',
        });
        fetchLedger();
        return;
      }
      if (isAuthStatus(normalized.status)) {
        handleAuthError(normalized.message);
      } else {
        toast.push({
          tone: 'error',
          message: normalized.message,
        });
      }
    } finally {
      setLoadingMore(false);
    }
  }, [
    fetchLedger,
    handleAuthError,
    ledgerLoading,
    loadingMore,
    nextCursor,
    refreshing,
    toast,
  ]);

  useEffect(() => {
    fetchWallet();
    fetchCoinBalance();
    fetchLedger();
  }, [fetchWallet, fetchCoinBalance, fetchLedger]);

  const refreshCoinData = useCallback(async () => {
    setNextCursor(null);
    setLedgerEntries([]);
    await Promise.all([fetchCoinBalance(), fetchLedger()]);
  }, [fetchCoinBalance, fetchLedger]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    setNextCursor(null);
    setLedgerEntries([]);
    try {
      await Promise.all([fetchWallet(), fetchCoinBalance(), fetchLedger()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchWallet, fetchCoinBalance, fetchLedger, refreshing]);

  const stopIpayPolling = useCallback(() => {
    ipayPollSessionRef.current.stop();
  }, []);

  const runIpayPollAttempt = useCallback(async (sessionId: number) => {
    if (!pendingIpayReference) {
      stopIpayPolling();
      return;
    }
    if (pendingIpayBalance === null) {
      return;
    }
    if (!ipayPollSessionRef.current.isActive(sessionId)) {
      return;
    }
    try {
      const data = await getSlcBalance();
      if (!ipayPollSessionRef.current.isActive(sessionId)) {
        return;
      }
      setCoinBalance(data);
      if (shouldCompleteIpayPolling(pendingIpayBalance, data.balance_cents)) {
        setPendingIpayReference(null);
        setPendingIpayBalance(null);
        stopIpayPolling();
        await refreshCoinData();
        toast.push({
          tone: 'info',
          message: 'SLC balance updated.',
        });
      }
    } catch (error) {
      const normalized = normalizeCoinApiError(error, 'Unable to refresh SLC balance.');
      if (normalized.status === 429) {
        stopIpayPolling();
        toast.push({ tone: 'error', message: normalized.message });
        return;
      }
      if (isAuthStatus(normalized.status)) {
        stopIpayPolling();
        handleAuthError(normalized.message);
        return;
      }
    }
  }, [
    handleAuthError,
    pendingIpayBalance,
    pendingIpayReference,
    refreshCoinData,
    stopIpayPolling,
    toast,
  ]);

  const scheduleIpayPolling = useCallback(() => {
    if (!pendingIpayReference) {
      return;
    }
    const delays = [0, 3000, 7000, 15000];
    ipayPollSessionRef.current.start(delays, async (sessionId, isLast) => {
      await runIpayPollAttempt(sessionId);
      if (isLast) {
        stopIpayPolling();
      }
    });
  }, [pendingIpayReference, runIpayPollAttempt, stopIpayPolling]);

  useEffect(() => {
    const handleAppStateChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && prev !== 'active') {
        scheduleIpayPolling();
        return;
      }
      if (next !== 'active') {
        stopIpayPolling();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      stopIpayPolling();
    };
  }, [scheduleIpayPolling, stopIpayPolling]);

  useFocusEffect(
    useCallback(() => {
      scheduleIpayPolling();
      return () => {
        stopIpayPolling();
      };
    }, [scheduleIpayPolling, stopIpayPolling]),
  );

  const handleOpenSend = useCallback(() => {
    setFormError(null);
    setSendVisible(true);
  }, []);

  const handleCloseSend = useCallback(() => {
    if (sending) {
      return;
    }
    setSendVisible(false);
  }, [sending]);

  const handleOpenSpend = useCallback(() => {
    setSpendError(null);
    setSpendFieldErrors(null);
    if (!spendReference && defaultSpendReference) {
      setSpendReference(defaultSpendReference);
    }
    setSpendVisible(true);
  }, [spendReference]);

  const handleCloseSpend = useCallback(() => {
    if (spending) {
      return;
    }
    setSpendVisible(false);
  }, [spending]);

  const handleOpenIpay = useCallback(() => {
    setIpayError(null);
    setIpayFieldErrors(null);
    setIpayVisible(true);
  }, []);

  const handleCloseIpay = useCallback(() => {
    if (ipayLoading) {
      return;
    }
    setIpayVisible(false);
  }, [ipayLoading]);

  const handleSubmitIpay = useCallback(async () => {
    if (ipayLoading) {
      return;
    }
    if (!env.ipayBaseUrl) {
      setIpayError('iPay is not configured for this build.');
      return;
    }
    const amountCents = parseDollarsToCents(ipayAmountInput);
    if (amountCents <= 0) {
      setIpayFieldErrors({ amount_cents: ['Enter an amount greater than 0.'] });
      setIpayError('Enter an amount greater than 0.');
      return;
    }
    if (!IPAY_CURRENCIES.includes(ipayCurrency)) {
      setIpayFieldErrors({ currency: ['Select a valid currency.'] });
      setIpayError('Select a valid currency.');
      return;
    }

    setIpayError(null);
    setIpayFieldErrors(null);
    setIpayLoading(true);
    try {
      const response = await createIpayCheckout({
        amount_cents: amountCents,
        currency: ipayCurrency,
      });
      const checkoutUrl = buildIpayCheckoutUrl(env.ipayBaseUrl, response.reference);
      if (!checkoutUrl) {
        throw new Error('Missing iPay checkout URL');
      }
      const canOpen = await Linking.canOpenURL(checkoutUrl);
      if (!canOpen) {
        throw new Error('Cannot open iPay checkout URL');
      }
      stopIpayPolling();
      setPendingIpayReference(response.reference);
      setPendingIpayBalance(coinBalance?.balance_cents ?? 0);
      setIpayVisible(false);
      setIpayAmountInput('');
      await Linking.openURL(checkoutUrl);
      toast.push({
        tone: 'info',
        message: 'Complete payment in iPay to receive SLC.',
      });
    } catch (error) {
      setPendingIpayReference(null);
      setPendingIpayBalance(null);
      const normalized = normalizeCoinApiError(error, 'Unable to start iPay checkout.');
      if (isAuthStatus(normalized.status)) {
        handleAuthError(normalized.message);
      } else {
        setIpayError(normalized.message);
        setIpayFieldErrors(normalized.fields ?? null);
        toast.push({ tone: 'error', message: normalized.message });
      }
    } finally {
      setIpayLoading(false);
    }
  }, [
    coinBalance?.balance_cents,
    handleAuthError,
    ipayAmountInput,
    ipayCurrency,
    ipayLoading,
    stopIpayPolling,
    toast,
  ]);

  const handleSubmitSpend = useCallback(async () => {
    if (spending || isSpendThrottled) {
      return;
    }
    const referenceValue = spendReference.trim();
    if (!referenceValue) {
      setSpendFieldErrors({ reference: ['Select a spend reference.'] });
      setSpendError('Select a spend reference.');
      return;
    }
    const isAllowedReference = COIN_SPEND_REFERENCES.some(
      (reference) => reference.value === referenceValue,
    );
    if (!isAllowedReference) {
      setSpendFieldErrors({ reference: ['Select a valid spend reference.'] });
      setSpendError('Select a valid spend reference.');
      return;
    }
    const amountCents = parseDollarsToCents(spendAmountInput);
    if (amountCents <= 0) {
      setSpendFieldErrors({ amount_cents: ['Enter an amount greater than 0.'] });
      setSpendError('Enter an amount greater than 0.');
      return;
    }
    if (coinBalance && amountCents > coinBalance.balance_cents) {
      setSpendFieldErrors({ amount_cents: ['Amount exceeds available SLC balance.'] });
      setSpendError('Amount exceeds available SLC balance.');
      return;
    }

    setSpendError(null);
    setSpendFieldErrors(null);
    setSpending(true);
    try {
      await spendSlc({
        amount_cents: amountCents,
        reference: referenceValue,
        note: spendNoteInput.trim() || undefined,
      });
      toast.push({
        tone: 'info',
        message: 'SLC spent. Balance and activity updated.',
      });
      setSpendVisible(false);
      setSpendAmountInput('');
      setSpendNoteInput('');
      await refreshCoinData();
    } catch (error) {
      const normalized = normalizeCoinApiError(error, 'Unable to spend SLC.');
      if (normalized.status === 429) {
        setSpendThrottleUntil(Date.now() + 3000);
      }
      setSpendError(normalized.message);
      setSpendFieldErrors(normalized.fields ?? null);
      if (isAuthStatus(normalized.status)) {
        handleAuthError(normalized.message);
      } else {
        toast.push({ tone: 'error', message: normalized.message });
      }
    } finally {
      setSpending(false);
    }
  }, [
    coinBalance,
    handleAuthError,
    refreshCoinData,
    isSpendThrottled,
    spendAmountInput,
    spendNoteInput,
    spendReference,
    spending,
    toast,
  ]);

  const handleSubmitTransfer = useCallback(async () => {
    if (sending || isThrottled) {
      return;
    }
    const recipientId = Number(recipientInput.trim());
    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      setFormError('Enter a valid recipient user ID.');
      return;
    }
    const amountCents = parseDollarsToCents(amountInput);
    if (amountCents <= 0) {
      setFormError('Enter an amount greater than 0.');
      return;
    }
    if (coinBalance && amountCents >= coinBalance.balance_cents) {
      setFormError('Insufficient balance. Transfers include a fee.');
      return;
    }

    setFormError(null);
    setSending(true);
    try {
      await transferSlc({
        to_user_id: recipientId,
        amount_cents: amountCents,
        note: noteInput.trim() || undefined,
      });
      toast.push({
        tone: 'info',
        message: 'SLC sent. Balance and activity updated.',
      });
      setSendVisible(false);
      setRecipientInput('');
      setAmountInput('');
      setNoteInput('');
      await refreshCoinData();
    } catch (error) {
      const normalized = normalizeCoinApiError(error, 'Unable to send SLC.');
      if (normalized.status === 429) {
        setThrottleUntil(Date.now() + 3000);
      }
      const message = normalized.message;
      setFormError(message);
      if (isAuthStatus(normalized.status)) {
        handleAuthError(message);
      } else {
        toast.push({ tone: 'error', message });
      }
    } finally {
      setSending(false);
    }
  }, [
    amountInput,
    coinBalance,
    handleAuthError,
    isThrottled,
    noteInput,
    recipientInput,
    refreshCoinData,
    sending,
    toast,
  ]);

  const walletBalance = useMemo(() => {
    if (!wallet) {
      return null;
    }
    return formatDollars(wallet.balance_cents);
  }, [wallet]);

  const slcBalance = useMemo(() => {
    if (!coinBalance) {
      return null;
    }
    return formatDollars(coinBalance.balance_cents);
  }, [coinBalance]);

  const spendReferenceError = spendFieldErrors?.reference?.[0];
  const spendAmountError = spendFieldErrors?.amount_cents?.[0];
  const spendNoteError = spendFieldErrors?.note?.[0];
  const hasSpendReferences = COIN_SPEND_REFERENCES.length > 0;
  const ipayAmountError = ipayFieldErrors?.amount_cents?.[0];
  const ipayCurrencyError = ipayFieldErrors?.currency?.[0];
  const ipayAmountCents = parseDollarsToCents(ipayAmountInput);
  const hasIpayBaseUrl = Boolean(env.ipayBaseUrl);
  const hasPendingIpay = Boolean(pendingIpayReference);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.palette.platinum}
            colors={[theme.palette.azure]}
          />
        }
      >
        <Text style={styles.headline}>Wallet</Text>
        <Text style={styles.subtitle}>
          Track payments and SLC credits in one place.
        </Text>

        <MetalPanel glow>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Wallet (Payments)</Text>
            <TouchableOpacity
              onPress={fetchWallet}
              disabled={walletLoading}
              style={styles.panelAction}
            >
              <Text style={styles.panelActionText}>
                {walletLoading ? 'Loading' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
          {walletLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={theme.palette.platinum} />
            </View>
          ) : walletError ? (
            <ErrorState message={walletError} onRetry={fetchWallet} />
          ) : walletBalance ? (
            <View>
              <Text style={styles.balanceValue}>{walletBalance}</Text>
              <Text style={styles.balanceCaption}>Available balance</Text>
            </View>
          ) : (
            <EmptyState title="Wallet not available yet." />
          )}
        </MetalPanel>

        <MetalPanel>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>SLC Balance (Credits)</Text>
            <TouchableOpacity
              onPress={fetchCoinBalance}
              disabled={coinLoading}
              style={styles.panelAction}
            >
              <Text style={styles.panelActionText}>
                {coinLoading ? 'Loading' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
          {coinLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={theme.palette.platinum} />
            </View>
          ) : coinError ? (
            <ErrorState message={coinError} onRetry={fetchCoinBalance} />
          ) : slcBalance ? (
            <View>
              <Text style={styles.balanceValue}>
                {slcBalance} <Text style={styles.balanceUnit}>SLC</Text>
              </Text>
              <Text style={styles.balanceCaption}>1.00 SLC = $1.00</Text>
            </View>
          ) : (
            <EmptyState title="SLC balance not available." />
          )}
          <View style={styles.buttonRow}>
            <MetalButton
              title="Send SLC"
              onPress={handleOpenSend}
              disabled={coinLoading || !coinBalance}
            />
            <MetalButton
              title="Spend SLC"
              onPress={handleOpenSpend}
              disabled={coinLoading || !coinBalance || !hasSpendReferences}
            />
            <MetalButton title="Buy SLC" onPress={handleOpenIpay} />
          </View>
          {hasPendingIpay ? (
            <View style={styles.pendingNotice}>
              <Text style={styles.pendingText}>
                Payment pending confirmation. It may take a moment.
              </Text>
              <MetalButton title="I&apos;ve paid" onPress={refreshCoinData} />
            </View>
          ) : null}
        </MetalPanel>

        <MetalPanel>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>SLC Activity</Text>
            <TouchableOpacity
              onPress={fetchLedger}
              disabled={ledgerLoading}
              style={styles.panelAction}
            >
              <Text style={styles.panelActionText}>
                {ledgerLoading ? 'Loading' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
          {ledgerLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={theme.palette.platinum} />
            </View>
          ) : ledgerError ? (
            <ErrorState message={ledgerError} onRetry={fetchLedger} />
          ) : ledgerEntries.length === 0 ? (
            <EmptyState title="No activity yet." />
          ) : (
            <>
              {ledgerEntries.map((entry, index) => {
                const title = formatLedgerTitle(entry);
                const counterparty = formatCounterparty(entry);
                const note = entry.note?.trim();
                const timestamp = formatTimestamp(entry.occurred_at || entry.created_at);
                const amountLabel = formatLedgerAmount(entry);
                const rowStyles = [
                  styles.ledgerRow,
                  index === 0 && styles.ledgerRowFirst,
                ];

                return (
                  <View key={String(entry.id)} style={rowStyles}>
                    <View style={styles.ledgerInfo}>
                      <Text style={styles.ledgerTitle}>{title}</Text>
                      <Text style={styles.ledgerMeta}>{counterparty}</Text>
                      {note ? <Text style={styles.ledgerNote}>{note}</Text> : null}
                    </View>
                    <View style={styles.ledgerAmountBlock}>
                      <Text
                        style={[
                          styles.ledgerAmount,
                          entry.direction === 'CREDIT'
                            ? styles.ledgerAmountPositive
                            : styles.ledgerAmountNegative,
                        ]}
                      >
                        {amountLabel}
                      </Text>
                      <Text style={styles.ledgerTimestamp}>{timestamp}</Text>
                    </View>
                  </View>
                );
              })}
              {nextCursor ? (
                <View style={styles.loadMoreRow}>
                  <MetalButton
                    title={loadingMore ? 'Loading more...' : 'Load more'}
                    onPress={loadMore}
                    disabled={loadingMore}
                  />
                </View>
              ) : null}
            </>
          )}
        </MetalPanel>
      </ScrollView>

      <Modal
        visible={sendVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseSend}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseSend} />
          <View style={styles.modalContent}>
            <MetalPanel glow style={styles.modalPanel}>
              <Text style={styles.modalTitle}>Send SLC</Text>
              <Text style={styles.modalSubtitle}>
                Enter a recipient user ID and amount.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Recipient user ID"
                placeholderTextColor={theme.palette.graphite}
                value={recipientInput}
                onChangeText={(text) => {
                  setRecipientInput(text);
                  setFormError(null);
                }}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Amount (USD)"
                placeholderTextColor={theme.palette.graphite}
                value={amountInput}
                onChangeText={(text) => {
                  setAmountInput(text);
                  setFormError(null);
                }}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Memo (optional)"
                placeholderTextColor={theme.palette.graphite}
                value={noteInput}
                onChangeText={setNoteInput}
              />
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <View style={styles.buttonRow}>
                <MetalButton
                  title={sending ? 'Sending...' : isThrottled ? 'Please wait...' : 'Send'}
                  onPress={handleSubmitTransfer}
                  disabled={sending || isThrottled}
                />
                <TouchableOpacity onPress={handleCloseSend} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </MetalPanel>
          </View>
        </View>
      </Modal>

      <Modal
        visible={spendVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseSpend}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseSpend} />
          <View style={styles.modalContent}>
            <MetalPanel glow style={styles.modalPanel}>
              <Text style={styles.modalTitle}>Spend SLC</Text>
              <Text style={styles.modalSubtitle}>
                Select a spend reference and amount.
              </Text>

              <Text style={styles.fieldLabel}>Spend for</Text>
              {hasSpendReferences ? (
                <View style={styles.referenceList}>
                  {COIN_SPEND_REFERENCES.map((reference) => {
                    const selected = reference.value === spendReference;
                    return (
                      <TouchableOpacity
                        key={reference.value}
                        onPress={() => {
                          setSpendReference(reference.value);
                          setSpendError(null);
                          setSpendFieldErrors(null);
                        }}
                        style={[
                          styles.referenceOption,
                          selected && styles.referenceOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.referenceLabel,
                            selected && styles.referenceLabelSelected,
                          ]}
                        >
                          {reference.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.formError}>No spend references configured.</Text>
              )}
              {spendReferenceError ? (
                <Text style={styles.fieldError}>{spendReferenceError}</Text>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder="Amount (USD)"
                placeholderTextColor={theme.palette.graphite}
                value={spendAmountInput}
                onChangeText={(text) => {
                  setSpendAmountInput(text);
                  setSpendError(null);
                  setSpendFieldErrors(null);
                }}
                keyboardType="decimal-pad"
              />
              {spendAmountError ? (
                <Text style={styles.fieldError}>{spendAmountError}</Text>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder="Memo (optional)"
                placeholderTextColor={theme.palette.graphite}
                value={spendNoteInput}
                onChangeText={(text) => {
                  setSpendNoteInput(text);
                  setSpendError(null);
                  setSpendFieldErrors(null);
                }}
              />
              {spendNoteError ? (
                <Text style={styles.fieldError}>{spendNoteError}</Text>
              ) : null}

              {spendError ? <Text style={styles.formError}>{spendError}</Text> : null}
              <View style={styles.buttonRow}>
                <MetalButton
                  title={
                    spending ? 'Spending...' : isSpendThrottled ? 'Please wait...' : 'Spend'
                  }
                  onPress={handleSubmitSpend}
                  disabled={spending || isSpendThrottled || !hasSpendReferences}
                />
                <TouchableOpacity onPress={handleCloseSpend} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </MetalPanel>
          </View>
        </View>
      </Modal>

      <Modal
        visible={ipayVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseIpay}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseIpay} />
          <View style={styles.modalContent}>
            <MetalPanel glow style={styles.modalPanel}>
              <Text style={styles.modalTitle}>Buy SLC</Text>
              <Text style={styles.modalSubtitle}>
                Choose an amount and currency to start iPay checkout.
              </Text>

              <Text style={styles.fieldLabel}>Currency</Text>
              <View style={styles.referenceList}>
                {IPAY_CURRENCIES.map((currency) => {
                  const selected = currency === ipayCurrency;
                  return (
                    <TouchableOpacity
                      key={currency}
                      onPress={() => {
                        setIpayCurrency(currency);
                        setIpayError(null);
                        setIpayFieldErrors(null);
                      }}
                      style={[
                        styles.referenceOption,
                        selected && styles.referenceOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.referenceLabel,
                          selected && styles.referenceLabelSelected,
                        ]}
                      >
                        {currency}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {ipayCurrencyError ? (
                <Text style={styles.fieldError}>{ipayCurrencyError}</Text>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder={`Amount (${ipayCurrency})`}
                placeholderTextColor={theme.palette.graphite}
                value={ipayAmountInput}
                onChangeText={(text) => {
                  setIpayAmountInput(text);
                  setIpayError(null);
                  setIpayFieldErrors(null);
                }}
                keyboardType="decimal-pad"
              />
              {ipayAmountError ? (
                <Text style={styles.fieldError}>{ipayAmountError}</Text>
              ) : null}

              {!hasIpayBaseUrl ? (
                <Text style={styles.fieldError}>
                  iPay checkout is not configured for this build.
                </Text>
              ) : null}

              {ipayError ? <Text style={styles.formError}>{ipayError}</Text> : null}
              <View style={styles.buttonRow}>
                <MetalButton
                  title={ipayLoading ? 'Starting...' : 'Continue'}
                  onPress={handleSubmitIpay}
                  disabled={ipayLoading || ipayAmountCents <= 0 || !hasIpayBaseUrl}
                />
                <TouchableOpacity onPress={handleCloseIpay} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </MetalPanel>
          </View>
        </View>
      </Modal>
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
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  panelTitle: {
    color: theme.palette.titanium,
    ...theme.typography.subtitle,
  },
  panelAction: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  panelActionText: {
    color: theme.palette.azure,
    ...theme.typography.caption,
    fontWeight: '600',
  },
  inlineLoading: {
    paddingVertical: theme.spacing.md,
  },
  balanceValue: {
    color: theme.palette.platinum,
    ...theme.typography.headingL,
  },
  balanceUnit: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  balanceCaption: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    marginTop: theme.spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
  },
  pendingNotice: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  pendingText: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  ledgerRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.palette.graphite,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  ledgerRowFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  ledgerInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  ledgerTitle: {
    color: theme.palette.platinum,
    ...theme.typography.body,
    fontWeight: '600',
  },
  ledgerMeta: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  ledgerNote: {
    color: theme.palette.titanium,
    ...theme.typography.caption,
  },
  ledgerAmountBlock: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  ledgerAmount: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  ledgerAmountPositive: {
    color: theme.palette.lime,
  },
  ledgerAmountNegative: {
    color: theme.palette.ember,
  },
  ledgerTimestamp: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  loadMoreRow: {
    marginTop: theme.spacing.md,
    alignItems: 'flex-start',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
  },
  modalContent: {
    padding: theme.spacing.lg,
  },
  modalPanel: {
    width: '100%',
  },
  modalTitle: {
    color: theme.palette.platinum,
    ...theme.typography.headingM,
    marginBottom: theme.spacing.xs,
  },
  modalSubtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
    marginBottom: theme.spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.palette.graphite,
    backgroundColor: theme.palette.obsidian,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.palette.platinum,
    ...theme.typography.body,
    marginBottom: theme.spacing.sm,
  },
  fieldLabel: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    marginBottom: theme.spacing.xs,
  },
  referenceList: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  referenceOption: {
    borderWidth: 1,
    borderColor: theme.palette.graphite,
    borderRadius: theme.radius.md,
    backgroundColor: theme.palette.obsidian,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  referenceOptionSelected: {
    borderColor: theme.palette.azure,
  },
  referenceLabel: {
    color: theme.palette.platinum,
    ...theme.typography.body,
  },
  referenceLabelSelected: {
    color: theme.palette.pearl,
  },
  fieldError: {
    color: theme.palette.ember,
    ...theme.typography.caption,
    marginBottom: theme.spacing.sm,
  },
  formError: {
    color: theme.palette.ember,
    ...theme.typography.caption,
    marginTop: theme.spacing.xs,
  },
  cancelButton: {
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  cancelText: {
    color: theme.palette.silver,
    ...theme.typography.button,
  },
});
