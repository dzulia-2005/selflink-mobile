import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Linking,
  Modal,
  Platform,
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

import { createBtcpayCheckout, normalizeBtcpayApiError } from '@api/btcpayCheckout';
import {
  SlcBalance,
  SlcLedgerEntry,
  getSlcBalance,
  listSlcLedger,
  normalizeCoinApiError,
  type NormalizedCoinError,
  spendSlc,
  transferSlc,
} from '@api/coin';
import {
  normalizeIapApiError,
  verifyIapPurchase,
  type IapPlatform,
  type VerifyIapRequest,
} from '@api/iap';
import { createIpayCheckout } from '@api/ipay';
import { createStripeCheckout, normalizeStripeApiError } from '@api/stripeCheckout';
import { EmptyState } from '@components/EmptyState';
import { ErrorState } from '@components/ErrorState';
import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { env } from '@config/env';
import { useToast } from '@context/ToastContext';
import { getWallet, Wallet } from '@services/api/payments';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';
import {
  createBtcpayPollSession,
  shouldCompleteBtcpayPolling,
} from '@utils/btcpayPolling';
import { parseDollarsToCents } from '@utils/currency';
import {
  createIapPollSession,
  shouldCompleteIapPolling,
  type IapPurchaseContext,
} from '@utils/iapPolling';
import {
  endIapConnection,
  fetchIapProducts,
  finalizeIapPurchase,
  getAvailableIapPurchases,
  IAP_ERROR_CODES,
  initIapConnection,
  listenForIapUpdates,
  mapPurchaseToVerifyRequest,
  normalizeIapPurchaseError,
  requestIapPurchase,
  type IapProduct,
  type IapPurchase,
  type IapPurchaseError,
} from '@utils/iapPurchase';
import { createIpayPollSession, shouldCompleteIpayPolling } from '@utils/ipayPolling';
import {
  createStripePollSession,
  shouldCompleteStripePolling,
} from '@utils/stripePolling';

import { COIN_SPEND_REFERENCES } from '../constants/coinSpendReferences';
import { getIapProductCatalog } from '../constants/iapProducts';

const LEDGER_PAGE_SIZE = 25;
const PURCHASE_CURRENCIES = ['USD', 'EUR', 'GEL'] as const;
const IPAY_CURRENCIES = PURCHASE_CURRENCIES;
const STRIPE_CURRENCIES = PURCHASE_CURRENCIES;
const BTCPAY_CURRENCIES = ['USD', 'EUR'] as const;
type PurchaseCurrency = (typeof PURCHASE_CURRENCIES)[number];
type IpayCurrency = PurchaseCurrency;
type StripeCurrency = PurchaseCurrency;
type BtcpayCurrency = (typeof BTCPAY_CURRENCIES)[number];
const IPAY_REFERENCE_PARAM = 'reference';

type ParsedApiError = {
  message: string;
  status?: number;
  code?: string;
};
const UNKNOWN_ERROR_MESSAGE = 'Unexpected error';

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
  return { message: UNKNOWN_ERROR_MESSAGE };
};

const isAuthStatus = (status?: number) => status === 401 || status === 403;

const normalizeWalletError = (
  error: unknown,
  fallback: string,
  options?: { authMessage?: string; networkMessage?: string },
): ParsedApiError => {
  const parsed = parseApiError(error);
  let message =
    !parsed.message || parsed.message === UNKNOWN_ERROR_MESSAGE
      ? fallback
      : parsed.message;
  if (isAuthStatus(parsed.status)) {
    message = options?.authMessage ?? message;
  } else if (!parsed.status && /network|failed to fetch/i.test(message)) {
    message = options?.networkMessage ?? message;
  }
  return { ...parsed, message };
};

const formatLedgerAmount = (entry: SlcLedgerEntry) => {
  const isCredit = entry.direction === 'CREDIT';
  const signed = isCredit ? entry.amount_cents : -entry.amount_cents;
  const prefix = signed >= 0 ? '+' : '-';
  return `${prefix}${formatDollars(Math.abs(signed))}`;
};

const formatTimestamp = (raw: string) => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString();
};

export function WalletLedgerScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const toast = useToast();
  const navigation = useNavigation<any>();
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
  const [spendFieldErrors, setSpendFieldErrors] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [spending, setSpending] = useState(false);
  const [spendThrottleUntil, setSpendThrottleUntil] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [iapVisible, setIapVisible] = useState(false);
  const [iapProducts, setIapProducts] = useState<IapProduct[]>([]);
  const [iapReady, setIapReady] = useState(false);
  const [iapProductsLoading, setIapProductsLoading] = useState(false);
  const [iapSelectedSku, setIapSelectedSku] = useState<string | null>(null);
  const [iapError, setIapError] = useState<string | null>(null);
  const [iapLoading, setIapLoading] = useState(false);
  const [iapRestoring, setIapRestoring] = useState(false);
  const [pendingIap, setPendingIap] = useState<IapPurchaseContext | null>(null);
  const [iapFinalizeFailed, setIapFinalizeFailed] = useState(false);
  const [ipayVisible, setIpayVisible] = useState(false);
  const [ipayAmountInput, setIpayAmountInput] = useState('');
  const [ipayCurrency, setIpayCurrency] = useState<IpayCurrency>(IPAY_CURRENCIES[0]);
  const [ipayError, setIpayError] = useState<string | null>(null);
  const [ipayFieldErrors, setIpayFieldErrors] = useState<Record<string, string[]> | null>(
    null,
  );
  const [ipayLoading, setIpayLoading] = useState(false);
  const [pendingIpayReference, setPendingIpayReference] = useState<string | null>(null);
  const [pendingIpayBalance, setPendingIpayBalance] = useState<number | null>(null);
  const [btcpayVisible, setBtcpayVisible] = useState(false);
  const [btcpayAmountInput, setBtcpayAmountInput] = useState('');
  const [btcpayCurrency, setBtcpayCurrency] = useState<BtcpayCurrency>(
    BTCPAY_CURRENCIES[0],
  );
  const [btcpayError, setBtcpayError] = useState<string | null>(null);
  const [btcpayFieldErrors, setBtcpayFieldErrors] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [btcpayLoading, setBtcpayLoading] = useState(false);
  const [pendingBtcpayReference, setPendingBtcpayReference] = useState<string | null>(
    null,
  );
  const [pendingBtcpayExpectedAmount, setPendingBtcpayExpectedAmount] = useState<
    number | null
  >(null);
  const [pendingBtcpayStartedAt, setPendingBtcpayStartedAt] = useState<number | null>(
    null,
  );
  const [stripeVisible, setStripeVisible] = useState(false);
  const [stripeAmountInput, setStripeAmountInput] = useState('');
  const [stripeCurrency, setStripeCurrency] = useState<StripeCurrency>(
    STRIPE_CURRENCIES[0],
  );
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeFieldErrors, setStripeFieldErrors] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [pendingStripeReference, setPendingStripeReference] = useState<string | null>(
    null,
  );
  const [pendingStripeStartBalance, setPendingStripeStartBalance] = useState<
    number | null
  >(null);
  const [pendingStripeExpectedAmount, setPendingStripeExpectedAmount] = useState<
    number | null
  >(null);
  const [pendingStripeStartedAt, setPendingStripeStartedAt] = useState<number | null>(
    null,
  );
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pendingIapRef = useRef<IapPurchaseContext | null>(null);
  const pendingIapPayloadRef = useRef<VerifyIapRequest | null>(null);
  const iapPurchaseInFlightRef = useRef(false);
  const iapPollSessionRef = useRef(createIapPollSession());
  const ipayPollSessionRef = useRef(createIpayPollSession());
  const btcpayPollSessionRef = useRef(createBtcpayPollSession());
  const stripePollSessionRef = useRef(createStripePollSession());
  const stripeLedgerCursorRef = useRef<string | null>(null);
  const btcpayLedgerCursorRef = useRef<string | null>(null);

  const isThrottled = throttleUntil !== null;
  const isSpendThrottled = spendThrottleUntil !== null;
  const iapCatalog = useMemo(() => getIapProductCatalog(), []);
  const iapSkus = useMemo(() => iapCatalog.map((item) => item.sku), [iapCatalog]);
  const iapProductMap = useMemo(() => {
    const map = new Map<string, IapProduct>();
    iapProducts.forEach((product) => {
      if (product.productId) {
        map.set(product.productId, product);
      }
    });
    return map;
  }, [iapProducts]);

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
        message: message ?? t('wallet.errors.sessionExpired'),
      });
      logout().catch(() => undefined);
    },
    [logout, t, toast],
  );

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const data = await getWallet();
      setWallet(data);
    } catch (error) {
      const normalized = normalizeWalletError(error, t('wallet.errors.loadWallet'), {
        authMessage: t('wallet.errors.signInToContinue'),
        networkMessage: t('wallet.errors.networkUnavailable'),
      });
      if (isAuthStatus(normalized.status)) {
        handleAuthError(normalized.message);
      }
      setWalletError(normalized.message);
    } finally {
      setWalletLoading(false);
    }
  }, [handleAuthError, t]);

  const fetchCoinBalance = useCallback(async () => {
    setCoinLoading(true);
    setCoinError(null);
    try {
      const data = await getSlcBalance();
      setCoinBalance(data);
    } catch (error) {
      const normalized = normalizeCoinApiError(error, t('wallet.errors.loadSlcBalance'));
      if (isAuthStatus(normalized.status)) {
        handleAuthError(normalized.message);
      }
      setCoinError(normalized.message);
    } finally {
      setCoinLoading(false);
    }
  }, [handleAuthError, t]);

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
      const normalized = normalizeCoinApiError(error, t('wallet.errors.loadSlcActivity'));
      if (isAuthStatus(normalized.status)) {
        handleAuthError(normalized.message);
      }
      setLedgerError(normalized.message);
    } finally {
      if (ledgerRequestId.current === requestId) {
        setLedgerLoading(false);
      }
    }
  }, [handleAuthError, t]);

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
      const normalized = normalizeCoinApiError(error, t('wallet.errors.loadMoreActivity'));
      if (normalized.status === 400 && /invalid cursor/i.test(normalized.message)) {
        setNextCursor(null);
        toast.push({
          tone: 'error',
          message: t('wallet.toasts.invalidCursorRefreshed'),
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
    t,
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

  const setPendingIapContext = useCallback((ctx: IapPurchaseContext | null) => {
    pendingIapRef.current = ctx;
    setPendingIap(ctx);
    if (!ctx) {
      pendingIapPayloadRef.current = null;
    }
  }, []);

  const stopIapPolling = useCallback(() => {
    iapPollSessionRef.current.stop();
  }, []);

  const clearIapPending = useCallback(() => {
    setPendingIapContext(null);
  }, [setPendingIapContext]);

  const runIapPollAttempt = useCallback(
    async (sessionId: number) => {
      const ctx = pendingIapRef.current;
      if (!ctx) {
        stopIapPolling();
        return;
      }
      if (!iapPollSessionRef.current.isActive(sessionId)) {
        return;
      }
      try {
        const ledgerData = await listSlcLedger({ limit: LEDGER_PAGE_SIZE });
        if (!iapPollSessionRef.current.isActive(sessionId)) {
          return;
        }
        if (shouldCompleteIapPolling(ctx, ledgerData.results)) {
          clearIapPending();
          stopIapPolling();
          await refreshCoinData();
          toast.push({
            tone: 'info',
            message: t('wallet.toasts.slcCredited'),
          });
        }
      } catch (error) {
        const normalized = normalizeCoinApiError(error, t('wallet.errors.refreshSlcBalance'));
        if (normalized.status === 429) {
          stopIapPolling();
          toast.push({ tone: 'error', message: normalized.message });
          return;
        }
        if (isAuthStatus(normalized.status)) {
          stopIapPolling();
          handleAuthError(normalized.message);
        }
      }
    },
    [clearIapPending, handleAuthError, refreshCoinData, stopIapPolling, t, toast],
  );

  const scheduleIapPolling = useCallback(() => {
    if (!pendingIapRef.current) {
      return;
    }
    const delays = [0, 3000, 7000, 15000];
    iapPollSessionRef.current.start(delays, async (sessionId, isLast) => {
      await runIapPollAttempt(sessionId);
      if (!iapPollSessionRef.current.isActive(sessionId)) {
        return;
      }
      if (isLast) {
        clearIapPending();
        stopIapPolling();
        toast.push({
          tone: 'info',
          message:
            t('wallet.toasts.purchasePending'),
        });
      }
    });
  }, [clearIapPending, runIapPollAttempt, stopIapPolling, t, toast]);

  const stopIpayPolling = useCallback(() => {
    ipayPollSessionRef.current.stop();
  }, []);

  const runIpayPollAttempt = useCallback(
    async (sessionId: number) => {
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
            message: t('wallet.toasts.balanceUpdated'),
          });
        }
      } catch (error) {
        const normalized = normalizeCoinApiError(error, t('wallet.errors.refreshSlcBalance'));
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
    },
    [
      handleAuthError,
      pendingIpayBalance,
      pendingIpayReference,
      refreshCoinData,
      stopIpayPolling,
      t,
      toast,
    ],
  );

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

  const stopBtcpayPolling = useCallback(() => {
    btcpayPollSessionRef.current.stop();
  }, []);

  const clearBtcpayPending = useCallback(() => {
    setPendingBtcpayReference(null);
    setPendingBtcpayExpectedAmount(null);
    setPendingBtcpayStartedAt(null);
    btcpayLedgerCursorRef.current = null;
  }, []);

  const runBtcpayPollAttempt = useCallback(
    async (sessionId: number) => {
      if (!pendingBtcpayReference) {
        stopBtcpayPolling();
        return;
      }
      if (pendingBtcpayExpectedAmount === null || pendingBtcpayStartedAt === null) {
        return;
      }
      if (!btcpayPollSessionRef.current.isActive(sessionId)) {
        return;
      }
      try {
        const balanceData = await getSlcBalance();
        if (!btcpayPollSessionRef.current.isActive(sessionId)) {
          return;
        }
        setCoinBalance(balanceData);
        const ledgerData = await listSlcLedger({
          cursor: btcpayLedgerCursorRef.current ?? undefined,
          limit: LEDGER_PAGE_SIZE,
        });
        if (!btcpayPollSessionRef.current.isActive(sessionId)) {
          return;
        }
        if (
          shouldCompleteBtcpayPolling(
            {
              reference: pendingBtcpayReference,
              expectedAmountCents: pendingBtcpayExpectedAmount,
              startedAtMs: pendingBtcpayStartedAt,
            },
            ledgerData.results,
          )
        ) {
          clearBtcpayPending();
          stopBtcpayPolling();
          await refreshCoinData();
          toast.push({
            tone: 'info',
            message: t('wallet.toasts.slcCredited'),
          });
        }
      } catch (error) {
        const normalized = normalizeCoinApiError(error, t('wallet.errors.refreshSlcBalance'));
        if (normalized.status === 429) {
          stopBtcpayPolling();
          toast.push({ tone: 'error', message: normalized.message });
          return;
        }
        if (isAuthStatus(normalized.status)) {
          stopBtcpayPolling();
          handleAuthError(normalized.message);
        }
      }
    },
    [
      clearBtcpayPending,
      handleAuthError,
      pendingBtcpayExpectedAmount,
      pendingBtcpayReference,
      pendingBtcpayStartedAt,
      refreshCoinData,
      stopBtcpayPolling,
      t,
      toast,
    ],
  );

  const scheduleBtcpayPolling = useCallback(() => {
    if (!pendingBtcpayReference) {
      return;
    }
    const delays = [0, 3000, 7000, 15000];
    btcpayPollSessionRef.current.start(delays, async (sessionId, isLast) => {
      await runBtcpayPollAttempt(sessionId);
      if (!btcpayPollSessionRef.current.isActive(sessionId)) {
        return;
      }
      if (isLast) {
        clearBtcpayPending();
        stopBtcpayPolling();
        toast.push({
          tone: 'info',
          message:
            'Payment pending. If you were charged, balance will update shortly. Pull to refresh.',
        });
      }
    });
  }, [
    clearBtcpayPending,
    pendingBtcpayReference,
    runBtcpayPollAttempt,
    stopBtcpayPolling,
    toast,
  ]);

  const stopStripePolling = useCallback(() => {
    stripePollSessionRef.current.stop();
  }, []);

  const clearStripePending = useCallback(() => {
    setPendingStripeReference(null);
    setPendingStripeStartBalance(null);
    setPendingStripeExpectedAmount(null);
    setPendingStripeStartedAt(null);
    stripeLedgerCursorRef.current = null;
  }, []);

  const runStripePollAttempt = useCallback(
    async (sessionId: number) => {
      if (!pendingStripeReference) {
        stopStripePolling();
        return;
      }
      if (
        pendingStripeStartBalance === null ||
        pendingStripeExpectedAmount === null ||
        pendingStripeStartedAt === null
      ) {
        return;
      }
      if (!stripePollSessionRef.current.isActive(sessionId)) {
        return;
      }
      try {
        const balanceData = await getSlcBalance();
        if (!stripePollSessionRef.current.isActive(sessionId)) {
          return;
        }
        setCoinBalance(balanceData);
        const ledgerData = await listSlcLedger({
          cursor: stripeLedgerCursorRef.current ?? undefined,
          limit: LEDGER_PAGE_SIZE,
        });
        if (!stripePollSessionRef.current.isActive(sessionId)) {
          return;
        }
        if (
          shouldCompleteStripePolling(
            {
              reference: pendingStripeReference,
              expectedAmountCents: pendingStripeExpectedAmount,
              startedAtMs: pendingStripeStartedAt,
            },
            ledgerData.results,
          )
        ) {
          clearStripePending();
          stopStripePolling();
          await refreshCoinData();
          toast.push({
            tone: 'info',
            message: 'SLC purchase confirmed.',
          });
        }
      } catch (error) {
        const normalized = normalizeCoinApiError(error, 'Unable to refresh SLC balance.');
        if (normalized.status === 400 && /invalid cursor/i.test(normalized.message)) {
          stripeLedgerCursorRef.current = null;
          return;
        }
        if (normalized.status === 429) {
          stopStripePolling();
          toast.push({ tone: 'error', message: normalized.message });
          return;
        }
        if (isAuthStatus(normalized.status)) {
          stopStripePolling();
          handleAuthError(normalized.message);
        }
      }
    },
    [
      clearStripePending,
      handleAuthError,
      pendingStripeExpectedAmount,
      pendingStripeReference,
      pendingStripeStartBalance,
      pendingStripeStartedAt,
      refreshCoinData,
      stopStripePolling,
      toast,
    ],
  );

  const scheduleStripePolling = useCallback(() => {
    if (!pendingStripeReference) {
      return;
    }
    const delays = [0, 3000, 7000, 15000];
    stripePollSessionRef.current.start(delays, async (sessionId, isLast) => {
      await runStripePollAttempt(sessionId);
      if (!stripePollSessionRef.current.isActive(sessionId)) {
        return;
      }
      if (isLast) {
        const startedAt = pendingStripeStartedAt;
        clearStripePending();
        stopStripePolling();
        toast.push({
          tone: 'info',
          message:
            startedAt !== null
              ? t('wallet.toasts.paymentPending')
              : t('wallet.toasts.paymentPending'),
        });
      }
    });
  }, [
    clearStripePending,
    pendingStripeReference,
    pendingStripeStartedAt,
    runStripePollAttempt,
    stopStripePolling,
    t,
    toast,
  ]);

  useEffect(() => {
    const handleAppStateChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && prev !== 'active') {
        scheduleIapPolling();
        scheduleIpayPolling();
        scheduleBtcpayPolling();
        scheduleStripePolling();
        return;
      }
      if (next !== 'active') {
        stopIapPolling();
        stopIpayPolling();
        stopBtcpayPolling();
        stopStripePolling();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      stopIapPolling();
      stopIpayPolling();
      stopBtcpayPolling();
      stopStripePolling();
    };
  }, [
    scheduleIapPolling,
    scheduleBtcpayPolling,
    scheduleIpayPolling,
    scheduleStripePolling,
    stopIapPolling,
    stopBtcpayPolling,
    stopIpayPolling,
    stopStripePolling,
  ]);

  useFocusEffect(
    useCallback(() => {
      scheduleIapPolling();
      scheduleIpayPolling();
      scheduleBtcpayPolling();
      scheduleStripePolling();
      return () => {
        stopIapPolling();
        stopIpayPolling();
        stopBtcpayPolling();
        stopStripePolling();
      };
    }, [
      scheduleIapPolling,
      scheduleBtcpayPolling,
      scheduleIpayPolling,
      scheduleStripePolling,
      stopIapPolling,
      stopBtcpayPolling,
      stopIpayPolling,
      stopStripePolling,
    ]),
  );

  type VerifyResult =
    | { status: 'success' }
    | { status: 'pending' }
    | { status: 'failed'; error: NormalizedCoinError };

  const verifyIapPayload = useCallback(
    async (
      payload: VerifyIapRequest,
      purchase?: IapPurchase,
      options?: { silent?: boolean },
    ): Promise<VerifyResult> => {
      clearIapPending();
      stopIapPolling();
      pendingIapPayloadRef.current = payload;
      try {
        await verifyIapPurchase(payload);
        if (purchase) {
          try {
            await finalizeIapPurchase(purchase);
            setIapFinalizeFailed(false);
          } catch (finalizeError) {
            setIapFinalizeFailed(true);
            toast.push({
              tone: 'error',
              message:
                t('wallet.toasts.finalizeFailed'),
            });
          }
        }
        pendingIapPayloadRef.current = null;
        await refreshCoinData();
        if (!options?.silent) {
          toast.push({ tone: 'info', message: t('wallet.toasts.purchaseConfirmed') });
        }
        return { status: 'success' };
      } catch (error) {
        const normalized = normalizeIapApiError(error, t('wallet.errors.verifyPurchase'));
        if (isAuthStatus(normalized.status)) {
          handleAuthError(normalized.message);
          return { status: 'failed', error: normalized };
        }
        if (normalized.status === 409) {
          const ctx: IapPurchaseContext = {
            platform: payload.platform,
            productId: payload.product_id,
            transactionId: payload.transaction_id,
            startedAtMs: Date.now(),
          };
          setPendingIapContext(ctx);
          scheduleIapPolling();
          if (!options?.silent) {
            toast.push({ tone: 'info', message: normalized.message });
          }
          return { status: 'pending' };
        }
        if (!options?.silent) {
          setIapError(normalized.message);
          toast.push({ tone: 'error', message: normalized.message });
        }
        return { status: 'failed', error: normalized };
      }
    },
    [
      clearIapPending,
      handleAuthError,
      refreshCoinData,
      scheduleIapPolling,
      setPendingIapContext,
      stopIapPolling,
      t,
      toast,
    ],
  );

  const handleIapPurchase = useCallback(
    async (purchase: IapPurchase) => {
      if (iapPurchaseInFlightRef.current) {
        return;
      }
      iapPurchaseInFlightRef.current = true;
      setIapLoading(true);
      setIapError(null);
      const platform: IapPlatform = Platform.OS === 'ios' ? 'ios' : 'android';
      const payload = mapPurchaseToVerifyRequest(purchase, platform);
      if (!payload) {
        iapPurchaseInFlightRef.current = false;
        setIapLoading(false);
        setIapError(t('wallet.errors.readPurchaseDetails'));
        toast.push({ tone: 'error', message: t('wallet.errors.readPurchaseDetails') });
        return;
      }
      try {
        await verifyIapPayload(payload, purchase);
      } finally {
        iapPurchaseInFlightRef.current = false;
        setIapLoading(false);
      }
    },
    [t, toast, verifyIapPayload],
  );

  const handleRestoreIapPurchases = useCallback(async () => {
    if (iapRestoring) {
      return;
    }
    if (!iapReady) {
      setIapError(t('wallet.errors.iapUnavailable'));
      return;
    }
    setIapRestoring(true);
    setIapError(null);
    try {
      const platform: IapPlatform = Platform.OS === 'ios' ? 'ios' : 'android';
      const purchases = await getAvailableIapPurchases();
      const eligible = purchases.filter((purchase) =>
        purchase.productId ? iapSkus.includes(purchase.productId) : false,
      );
      if (eligible.length === 0) {
        setIapError(t('wallet.errors.noPurchasesToRestore'));
        return;
      }
      for (const purchase of eligible) {
        const payload = mapPurchaseToVerifyRequest(purchase, platform);
        if (!payload) {
          continue;
        }
        await verifyIapPayload(payload, purchase, { silent: true });
      }
      toast.push({ tone: 'info', message: t('wallet.toasts.restoreCompleted') });
    } catch (error) {
      const normalized = normalizeIapPurchaseError(error);
      setIapError(normalized.message);
      toast.push({ tone: 'error', message: normalized.message });
    } finally {
      setIapRestoring(false);
    }
  }, [iapReady, iapRestoring, iapSkus, t, toast, verifyIapPayload]);

  const handleIapPurchaseError = useCallback(
    (error: IapPurchaseError) => {
      const normalized = normalizeIapPurchaseError(error);
      if (normalized.code && IAP_ERROR_CODES.cancelled.has(normalized.code)) {
        iapPurchaseInFlightRef.current = false;
        setIapLoading(false);
        toast.push({ tone: 'info', message: t('wallet.toasts.purchaseCancelled') });
        return;
      }
      if (normalized.code && IAP_ERROR_CODES.alreadyOwned.has(normalized.code)) {
        iapPurchaseInFlightRef.current = false;
        setIapLoading(false);
        toast.push({
          tone: 'info',
          message: t('wallet.toasts.purchaseOwnedCheckingRestore'),
        });
        handleRestoreIapPurchases().catch(() => undefined);
        return;
      }
      iapPurchaseInFlightRef.current = false;
      setIapLoading(false);
      setIapError(normalized.message);
      toast.push({ tone: 'error', message: normalized.message });
    },
    [handleRestoreIapPurchases, t, toast],
  );

  const handleOpenIap = useCallback(() => {
    setIapError(null);
    if (!iapReady) {
      setIapError(t('wallet.errors.iapUnavailable'));
    }
    setIapVisible(true);
  }, [iapReady, t]);

  const handleCloseIap = useCallback(() => {
    if (iapLoading || iapRestoring) {
      return;
    }
    setIapVisible(false);
  }, [iapLoading, iapRestoring]);

  const handleSubmitIap = useCallback(async () => {
    if (iapLoading || iapRestoring) {
      return;
    }
    if (!iapReady) {
      setIapError(t('wallet.errors.iapUnavailable'));
      return;
    }
    if (!iapSelectedSku) {
      setIapError(t('wallet.errors.selectProduct'));
      return;
    }
    setIapError(null);
    setIapLoading(true);
    try {
      clearIapPending();
      stopIapPolling();
      await requestIapPurchase(iapSelectedSku);
      setIapVisible(false);
    } catch (error) {
      const normalized = normalizeIapPurchaseError(error);
      setIapLoading(false);
      setIapError(normalized.message);
      toast.push({ tone: 'error', message: normalized.message });
    }
  }, [
    clearIapPending,
    iapLoading,
    iapReady,
    iapRestoring,
    iapSelectedSku,
    stopIapPolling,
    t,
    toast,
  ]);

  const handleRetryIapVerification = useCallback(async () => {
    if (iapLoading || iapRestoring) {
      return;
    }
    if (!iapReady) {
      setIapError(t('wallet.errors.iapUnavailable'));
      return;
    }
    const payload = pendingIapPayloadRef.current;
    if (!payload) {
      toast.push({ tone: 'error', message: t('wallet.errors.noPendingPurchase') });
      return;
    }
    setIapLoading(true);
    try {
      await verifyIapPayload(payload);
    } finally {
      setIapLoading(false);
    }
  }, [iapLoading, iapReady, iapRestoring, t, toast, verifyIapPayload]);

  useEffect(() => {
    let removeListeners: (() => void) | null = null;
    let active = true;
    const setup = async () => {
      const connected = await initIapConnection();
      if (!active) {
        return;
      }
      setIapReady(connected);
      if (!connected) {
        return;
      }
      removeListeners = listenForIapUpdates(handleIapPurchase, handleIapPurchaseError);
    };
    setup();
    return () => {
      active = false;
      removeListeners?.();
      endIapConnection();
      setIapReady(false);
    };
  }, [handleIapPurchase, handleIapPurchaseError]);

  useEffect(() => {
    if (!iapVisible) {
      return;
    }
    if (!iapReady) {
      setIapError(t('wallet.errors.iapUnavailable'));
      setIapProductsLoading(false);
      return;
    }
    if (iapSkus.length === 0) {
      setIapError(t('wallet.errors.noProductsConfigured'));
      setIapProductsLoading(false);
      return;
    }
    setIapProductsLoading(true);
    setIapError(null);
    fetchIapProducts(iapSkus)
      .then((products) => {
        setIapProducts(products);
        if (!iapSelectedSku && iapSkus.length > 0) {
          setIapSelectedSku(iapSkus[0]);
        }
      })
      .catch(() => {
        setIapError(t('wallet.errors.loadIapProducts'));
      })
      .finally(() => setIapProductsLoading(false));
  }, [iapReady, iapSelectedSku, iapSkus, iapVisible, t]);

  const handleOpenSend = useCallback(() => {
    setFormError(null);
    setSendVisible(true);
  }, []);

  const handleFindUser = useCallback(() => {
    setSendVisible(false);
    navigation.navigate('Profile', { screen: 'SearchProfiles' });
  }, [navigation]);

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

  const handleOpenBtcpay = useCallback(() => {
    setBtcpayError(null);
    setBtcpayFieldErrors(null);
    setBtcpayVisible(true);
  }, []);

  const handleCloseBtcpay = useCallback(() => {
    if (btcpayLoading) {
      return;
    }
    setBtcpayVisible(false);
  }, [btcpayLoading]);

  const handleSubmitBtcpay = useCallback(async () => {
    if (btcpayLoading) {
      return;
    }
    const amountCents = parseDollarsToCents(btcpayAmountInput);
    if (amountCents <= 0) {
      setBtcpayFieldErrors({ amount_cents: [t('wallet.errors.amountGreaterThanZero')] });
      setBtcpayError(t('wallet.errors.amountGreaterThanZero'));
      return;
    }
    if (!BTCPAY_CURRENCIES.includes(btcpayCurrency)) {
      setBtcpayFieldErrors({ currency: [t('wallet.errors.selectValidCurrency')] });
      setBtcpayError(t('wallet.errors.selectValidCurrency'));
      return;
    }

    setBtcpayError(null);
    setBtcpayFieldErrors(null);
    setBtcpayLoading(true);
    try {
      const response = await createBtcpayCheckout({
        amountCents: amountCents,
        currency: btcpayCurrency,
      });
      if (!response.payment_url) {
        throw new Error(t('wallet.errors.missingBtcpayUrl'));
      }
      const canOpen = await Linking.canOpenURL(response.payment_url);
      if (!canOpen) {
        throw new Error(t('wallet.errors.cannotOpenBtcpayUrl'));
      }
      stopBtcpayPolling();
      btcpayLedgerCursorRef.current = null;
      setPendingBtcpayReference(response.reference);
      setPendingBtcpayExpectedAmount(response.amount_cents);
      setPendingBtcpayStartedAt(Date.now());
      setBtcpayVisible(false);
      setBtcpayAmountInput('');
      await Linking.openURL(response.payment_url);
      toast.push({
        tone: 'info',
        message: t('wallet.toasts.completeBtcpayCheckout'),
      });
    } catch (error) {
      const normalized = normalizeBtcpayApiError(
        error,
        t('wallet.errors.startBtcpayCheckout'),
      );
      if (isAuthStatus(normalized.status)) {
        handleAuthError(normalized.message);
      } else {
        setBtcpayError(normalized.message);
        setBtcpayFieldErrors(normalized.fields ?? null);
        toast.push({ tone: 'error', message: normalized.message });
      }
    } finally {
      setBtcpayLoading(false);
    }
  }, [
    btcpayAmountInput,
    btcpayCurrency,
    btcpayLoading,
    handleAuthError,
    stopBtcpayPolling,
    t,
    toast,
  ]);

  const handleSubmitIpay = useCallback(async () => {
    if (ipayLoading) {
      return;
    }
    if (!env.ipayBaseUrl) {
      setIpayError(t('wallet.errors.ipayNotConfigured'));
      return;
    }
    const amountCents = parseDollarsToCents(ipayAmountInput);
    if (amountCents <= 0) {
      setIpayFieldErrors({ amount_cents: [t('wallet.errors.amountGreaterThanZero')] });
      setIpayError(t('wallet.errors.amountGreaterThanZero'));
      return;
    }
    if (!IPAY_CURRENCIES.includes(ipayCurrency)) {
      setIpayFieldErrors({ currency: [t('wallet.errors.selectValidCurrency')] });
      setIpayError(t('wallet.errors.selectValidCurrency'));
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
      let baselineBalance = coinBalance?.balance_cents;
      if (baselineBalance === null || baselineBalance === undefined) {
        try {
          const balanceSnapshot = await getSlcBalance();
          setCoinBalance(balanceSnapshot);
          baselineBalance = balanceSnapshot.balance_cents;
        } catch (error) {
          const normalized = normalizeCoinApiError(
            error,
            t('wallet.errors.refreshSlcBalance'),
          );
          if (isAuthStatus(normalized.status)) {
            handleAuthError(normalized.message);
          } else {
            setIpayError(normalized.message);
            toast.push({ tone: 'error', message: normalized.message });
          }
          return;
        }
      }
      if (baselineBalance === null || baselineBalance === undefined) {
        setIpayError(t('wallet.errors.refreshSlcBalance'));
        toast.push({ tone: 'error', message: t('wallet.errors.refreshSlcBalance') });
        return;
      }
      const checkoutUrl = buildIpayCheckoutUrl(env.ipayBaseUrl, response.reference);
      if (!checkoutUrl) {
        throw new Error(t('wallet.errors.missingIpayUrl'));
      }
      const canOpen = await Linking.canOpenURL(checkoutUrl);
      if (!canOpen) {
        throw new Error(t('wallet.errors.cannotOpenIpayUrl'));
      }
      stopIpayPolling();
      setPendingIpayReference(response.reference);
      setPendingIpayBalance(baselineBalance);
      setIpayVisible(false);
      setIpayAmountInput('');
      await Linking.openURL(checkoutUrl);
      toast.push({
        tone: 'info',
        message: t('wallet.toasts.completeIpayCheckout'),
      });
    } catch (error) {
      setPendingIpayReference(null);
      setPendingIpayBalance(null);
      const normalized = normalizeCoinApiError(error, t('wallet.errors.startIpayCheckout'));
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
    t,
    toast,
  ]);

  const handleOpenStripe = useCallback(() => {
    setStripeError(null);
    setStripeFieldErrors(null);
    setStripeVisible(true);
  }, []);

  const handleCloseStripe = useCallback(() => {
    if (stripeLoading) {
      return;
    }
    setStripeVisible(false);
  }, [stripeLoading]);

  const handleSubmitStripe = useCallback(async () => {
    if (stripeLoading) {
      return;
    }
    const amountCents = parseDollarsToCents(stripeAmountInput);
    if (amountCents <= 0) {
      setStripeFieldErrors({ amount_cents: [t('wallet.errors.amountGreaterThanZero')] });
      setStripeError(t('wallet.errors.amountGreaterThanZero'));
      return;
    }
    if (!STRIPE_CURRENCIES.includes(stripeCurrency)) {
      setStripeFieldErrors({ currency: [t('wallet.errors.selectValidCurrency')] });
      setStripeError(t('wallet.errors.selectValidCurrency'));
      return;
    }

    setStripeError(null);
    setStripeFieldErrors(null);
    setStripeLoading(true);
    try {
      const response = await createStripeCheckout({
        amountCents: amountCents,
        currency: stripeCurrency,
      });
      let baselineBalance = coinBalance?.balance_cents;
      if (baselineBalance === null || baselineBalance === undefined) {
        try {
          const balanceSnapshot = await getSlcBalance();
          setCoinBalance(balanceSnapshot);
          baselineBalance = balanceSnapshot.balance_cents;
        } catch (error) {
          const normalized = normalizeCoinApiError(
            error,
            t('wallet.errors.refreshSlcBalance'),
          );
          if (isAuthStatus(normalized.status)) {
            handleAuthError(normalized.message);
          } else {
            setStripeError(normalized.message);
            toast.push({ tone: 'error', message: normalized.message });
          }
          return;
        }
      }
      if (baselineBalance === null || baselineBalance === undefined) {
        setStripeError(t('wallet.errors.refreshSlcBalance'));
        toast.push({ tone: 'error', message: t('wallet.errors.refreshSlcBalance') });
        return;
      }
      if (!response.payment_url) {
        throw new Error(t('wallet.errors.missingStripeUrl'));
      }
      const canOpen = await Linking.canOpenURL(response.payment_url);
      if (!canOpen) {
        throw new Error(t('wallet.errors.cannotOpenStripeUrl'));
      }
      stopStripePolling();
      stripeLedgerCursorRef.current = null;
      setPendingStripeReference(response.reference);
      setPendingStripeStartBalance(baselineBalance);
      setPendingStripeExpectedAmount(response.amount_cents);
      setPendingStripeStartedAt(Date.now());
      setStripeVisible(false);
      setStripeAmountInput('');
      await Linking.openURL(response.payment_url);
      toast.push({
        tone: 'info',
        message: t('wallet.toasts.completeStripeCheckout'),
      });
    } catch (error) {
      const normalized = normalizeStripeApiError(
        error,
        t('wallet.errors.startStripeCheckout'),
      );
      if (isAuthStatus(normalized.status)) {
        handleAuthError(normalized.message);
      } else {
        setStripeError(normalized.message);
        setStripeFieldErrors(normalized.fields ?? null);
        toast.push({ tone: 'error', message: normalized.message });
      }
    } finally {
      setStripeLoading(false);
    }
  }, [
    coinBalance?.balance_cents,
    handleAuthError,
    stripeAmountInput,
    stripeCurrency,
    stripeLoading,
    stopStripePolling,
    t,
    toast,
  ]);

  const handleSubmitSpend = useCallback(async () => {
    if (spending || isSpendThrottled) {
      return;
    }
    const referenceValue = spendReference.trim();
    if (!referenceValue) {
      setSpendFieldErrors({ reference: [t('wallet.errors.selectSpendReference')] });
      setSpendError(t('wallet.errors.selectSpendReference'));
      return;
    }
    const isAllowedReference = COIN_SPEND_REFERENCES.some(
      (reference) => reference.value === referenceValue,
    );
    if (!isAllowedReference) {
      setSpendFieldErrors({ reference: [t('wallet.errors.selectValidSpendReference')] });
      setSpendError(t('wallet.errors.selectValidSpendReference'));
      return;
    }
    const amountCents = parseDollarsToCents(spendAmountInput);
    if (amountCents <= 0) {
      setSpendFieldErrors({ amount_cents: [t('wallet.errors.amountGreaterThanZero')] });
      setSpendError(t('wallet.errors.amountGreaterThanZero'));
      return;
    }
    if (coinBalance && amountCents > coinBalance.balance_cents) {
      setSpendFieldErrors({ amount_cents: [t('wallet.errors.amountExceedsBalance')] });
      setSpendError(t('wallet.errors.amountExceedsBalance'));
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
        message: t('wallet.toasts.slcSpent'),
      });
      setSpendVisible(false);
      setSpendAmountInput('');
      setSpendNoteInput('');
      await refreshCoinData();
    } catch (error) {
      const normalized = normalizeCoinApiError(error, t('wallet.errors.spendSlc'));
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
    t,
    toast,
  ]);

  const handlePasteRecipient = useCallback(async () => {
    try {
      const pasted = await Clipboard.getStringAsync();
      if (!pasted.trim()) {
        toast.push({ tone: 'info', message: t('wallet.toasts.clipboardEmpty') });
        return;
      }
      setRecipientInput(pasted.trim());
      setFormError(null);
    } catch (error) {
      console.warn('Wallet: paste recipient failed', error);
      toast.push({ tone: 'error', message: t('wallet.errors.pasteFailed') });
    }
  }, [t, toast]);

  const handleSubmitTransfer = useCallback(async () => {
    if (sending || isThrottled) {
      return;
    }
    const receiverAccountKey = recipientInput.trim();
    if (!receiverAccountKey) {
      setFormError(t('wallet.errors.enterRecipientId'));
      return;
    }
    const amountCents = parseDollarsToCents(amountInput);
    if (amountCents <= 0) {
      setFormError(t('wallet.errors.amountGreaterThanZero'));
      return;
    }
    if (coinBalance && amountCents >= coinBalance.balance_cents) {
      setFormError(t('wallet.errors.insufficientBalance'));
      return;
    }

    setFormError(null);
    setSending(true);
    try {
      await transferSlc({
        receiver_account_key: receiverAccountKey,
        amount_cents: amountCents,
        note: noteInput.trim() || undefined,
      });
      toast.push({
        tone: 'info',
        message: t('wallet.toasts.slcSent'),
      });
      setSendVisible(false);
      setRecipientInput('');
      setAmountInput('');
      setNoteInput('');
      await refreshCoinData();
    } catch (error) {
      const normalized = normalizeCoinApiError(error, t('wallet.errors.sendSlc'));
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
    t,
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
  const hasPendingIap = Boolean(pendingIap);
  const ipayAmountError = ipayFieldErrors?.amount_cents?.[0];
  const ipayCurrencyError = ipayFieldErrors?.currency?.[0];
  const ipayAmountCents = parseDollarsToCents(ipayAmountInput);
  const hasIpayBaseUrl = Boolean(env.ipayBaseUrl);
  const hasPendingIpay = Boolean(pendingIpayReference);
  const btcpayAmountError = btcpayFieldErrors?.amount_cents?.[0];
  const btcpayCurrencyError = btcpayFieldErrors?.currency?.[0];
  const btcpayAmountCents = parseDollarsToCents(btcpayAmountInput);
  const hasPendingBtcpay = Boolean(pendingBtcpayReference);
  const stripeAmountError = stripeFieldErrors?.amount_cents?.[0];
  const stripeCurrencyError = stripeFieldErrors?.currency?.[0];
  const stripeAmountCents = parseDollarsToCents(stripeAmountInput);
  const hasPendingStripe = Boolean(pendingStripeReference);
  const formatLedgerTitleText = useCallback(
    (entry: SlcLedgerEntry) => {
      const eventType = entry.event_type?.toLowerCase();
      if (eventType === 'transfer') {
        return entry.direction === 'DEBIT'
          ? t('wallet.ledger.title.sent')
          : t('wallet.ledger.title.received');
      }
      if (eventType === 'spend') {
        return t('wallet.ledger.title.spent');
      }
      if (eventType === 'mint') {
        return t('wallet.ledger.title.minted');
      }
      if (eventType === 'refund') {
        return t('wallet.ledger.title.refunded');
      }
      return t('wallet.ledger.title.default');
    },
    [t],
  );
  const formatCounterpartyText = useCallback(
    (entry: SlcLedgerEntry) => {
      const eventType = entry.event_type?.toLowerCase();
      const metadata = entry.event_metadata ?? {};
      const toUserId =
        typeof metadata.to_user_id === 'number' ? metadata.to_user_id : undefined;
      const senderUserId =
        typeof metadata.sender_user_id === 'number' ? metadata.sender_user_id : undefined;
      const reference =
        typeof metadata.reference === 'string' ? metadata.reference : undefined;
      const provider = typeof metadata.provider === 'string' ? metadata.provider : undefined;

      if (eventType === 'transfer') {
        if (entry.direction === 'DEBIT' && toUserId) {
          return t('wallet.ledger.counterparty.toUser', { id: toUserId });
        }
        if (entry.direction === 'CREDIT' && senderUserId) {
          return t('wallet.ledger.counterparty.fromUser', { id: senderUserId });
        }
        if (toUserId) {
          return t('wallet.ledger.counterparty.toUser', { id: toUserId });
        }
        if (senderUserId) {
          return t('wallet.ledger.counterparty.fromUser', { id: senderUserId });
        }
      }
      if (eventType === 'spend' && reference) {
        return t('wallet.ledger.counterparty.reference', { reference });
      }
      if (eventType === 'mint' && provider) {
        return t('wallet.ledger.counterparty.mintedVia', { provider });
      }
      return t('wallet.ledger.counterparty.default');
    },
    [t],
  );

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
        <Text style={styles.headline}>{t('wallet.title')}</Text>
        <Text style={styles.subtitle}>{t('wallet.subtitle')}</Text>

        <MetalPanel glow>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>{t('wallet.balance.title')}</Text>
            <TouchableOpacity
              onPress={fetchWallet}
              disabled={walletLoading}
              style={styles.panelAction}
            >
              <Text style={styles.panelActionText}>
                {walletLoading ? t('common.loading') : t('common.retry')}
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
              <Text style={styles.balanceCaption}>{t('wallet.balance.available')}</Text>
            </View>
          ) : (
            <EmptyState title={t('wallet.balance.empty')} />
          )}
        </MetalPanel>

        <MetalPanel>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>{t('wallet.slc.title')}</Text>
            <TouchableOpacity
              onPress={fetchCoinBalance}
              disabled={coinLoading}
              style={styles.panelAction}
            >
              <Text style={styles.panelActionText}>
                {coinLoading ? t('common.loading') : t('common.retry')}
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
                {slcBalance} <Text style={styles.balanceUnit}>{t('wallet.slc.unit')}</Text>
              </Text>
              <Text style={styles.balanceCaption}>{t('wallet.slc.rate')}</Text>
            </View>
          ) : (
            <EmptyState title={t('wallet.slc.empty')} />
          )}
          <View style={styles.buttonRow}>
            <MetalButton
              title={t('wallet.actions.sendSlc')}
              onPress={handleOpenSend}
              disabled={coinLoading || !coinBalance}
            />
            <MetalButton
              title={t('wallet.actions.spendSlc')}
              onPress={handleOpenSpend}
              disabled={coinLoading || !coinBalance || !hasSpendReferences}
            />
            <MetalButton title={t('wallet.actions.buySlcIap')} onPress={handleOpenIap} />
            <MetalButton title={t('wallet.actions.buySlcStripe')} onPress={handleOpenStripe} />
            <MetalButton title={t('wallet.actions.buySlcIpay')} onPress={handleOpenIpay} />
            <MetalButton title={t('wallet.actions.buySlcBtcpay')} onPress={handleOpenBtcpay} />
          </View>
          <TouchableOpacity style={styles.inlineLink} onPress={handleFindUser}>
            <Text style={styles.inlineLinkText}>{t('wallet.actions.findUser')}</Text>
          </TouchableOpacity>
          {hasPendingIap ? (
            <View style={styles.pendingNotice}>
              <Text style={styles.pendingText}>{t('wallet.pending.iap')}</Text>
              <MetalButton
                title={t('wallet.actions.retryVerification')}
                onPress={handleRetryIapVerification}
                disabled={iapLoading || iapRestoring || !iapReady}
              />
            </View>
          ) : null}
          {!hasPendingIap && iapFinalizeFailed ? (
            <View style={styles.pendingNotice}>
              <Text style={styles.pendingText}>{t('wallet.pending.finalizeFailed')}</Text>
              <MetalButton
                title={
                  iapRestoring ? t('wallet.actions.restoring') : t('wallet.actions.restore')
                }
                onPress={handleRestoreIapPurchases}
                disabled={iapRestoring || !iapReady}
              />
            </View>
          ) : null}
          {hasPendingStripe ? (
            <View style={styles.pendingNotice}>
              <Text style={styles.pendingText}>{t('wallet.pending.stripe')}</Text>
              <MetalButton title={t('wallet.actions.ivePaid')} onPress={refreshCoinData} />
            </View>
          ) : null}
          {hasPendingBtcpay ? (
            <View style={styles.pendingNotice}>
              <Text style={styles.pendingText}>{t('wallet.pending.btcpay')}</Text>
              <MetalButton title={t('wallet.actions.ivePaid')} onPress={refreshCoinData} />
            </View>
          ) : null}
          {hasPendingIpay ? (
            <View style={styles.pendingNotice}>
              <Text style={styles.pendingText}>{t('wallet.pending.ipay')}</Text>
              <MetalButton title={t('wallet.actions.ivePaid')} onPress={refreshCoinData} />
            </View>
          ) : null}
        </MetalPanel>

        <MetalPanel>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>{t('transactions.title')}</Text>
            <TouchableOpacity
              onPress={fetchLedger}
              disabled={ledgerLoading}
              style={styles.panelAction}
            >
              <Text style={styles.panelActionText}>
                {ledgerLoading ? t('common.loading') : t('common.retry')}
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
            <EmptyState title={t('transactions.empty')} />
          ) : (
            <>
              {ledgerEntries.map((entry, index) => {
                const title = formatLedgerTitleText(entry);
                const counterparty = formatCounterpartyText(entry);
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
                    title={loadingMore ? t('transactions.loadingMore') : t('transactions.loadMore')}
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
              <Text style={styles.modalTitle}>{t('wallet.send.title')}</Text>
              <Text style={styles.modalSubtitle}>{t('wallet.send.subtitle')}</Text>
              <Text style={styles.fieldLabel}>{t('wallet.send.recipientLabel')}</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputGrow]}
                  placeholder={t('wallet.send.recipientPlaceholder')}
                  placeholderTextColor={theme.palette.graphite}
                  value={recipientInput}
                  onChangeText={(text) => {
                    setRecipientInput(text);
                    setFormError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.pasteButton}
                  onPress={handlePasteRecipient}
                  activeOpacity={0.85}
                >
                  <Text style={styles.pasteLabel}>{t('wallet.actions.paste')}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('wallet.send.amountPlaceholder')}
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
                placeholder={t('wallet.send.memoPlaceholder')}
                placeholderTextColor={theme.palette.graphite}
                value={noteInput}
                onChangeText={setNoteInput}
              />
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <View style={styles.buttonRow}>
                <MetalButton
                  title={
                    sending
                      ? t('wallet.actions.sending')
                      : isThrottled
                        ? t('wallet.actions.pleaseWait')
                        : t('wallet.actions.send')
                  }
                  onPress={handleSubmitTransfer}
                  disabled={sending || isThrottled}
                />
                <TouchableOpacity onPress={handleCloseSend} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
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
              <Text style={styles.modalTitle}>{t('wallet.spend.title')}</Text>
              <Text style={styles.modalSubtitle}>{t('wallet.spend.subtitle')}</Text>

              <Text style={styles.fieldLabel}>{t('wallet.spend.referenceLabel')}</Text>
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
                <Text style={styles.formError}>{t('wallet.spend.noReferences')}</Text>
              )}
              {spendReferenceError ? (
                <Text style={styles.fieldError}>{spendReferenceError}</Text>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder={t('wallet.spend.amountPlaceholder')}
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
                placeholder={t('wallet.spend.memoPlaceholder')}
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
                    spending
                      ? t('wallet.actions.spending')
                      : isSpendThrottled
                        ? t('wallet.actions.pleaseWait')
                        : t('wallet.actions.spend')
                  }
                  onPress={handleSubmitSpend}
                  disabled={spending || isSpendThrottled || !hasSpendReferences}
                />
                <TouchableOpacity onPress={handleCloseSpend} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </MetalPanel>
          </View>
        </View>
      </Modal>

      <Modal
        visible={iapVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseIap}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseIap} />
          <View style={styles.modalContent}>
            <MetalPanel glow style={styles.modalPanel}>
              <Text style={styles.modalTitle}>{t('wallet.iap.title')}</Text>
              <Text style={styles.modalSubtitle}>{t('wallet.iap.subtitle')}</Text>

              <Text style={styles.fieldLabel}>{t('wallet.iap.availablePacks')}</Text>
              {iapProductsLoading ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator color={theme.palette.platinum} />
                </View>
              ) : (
                <View style={styles.referenceList}>
                  {iapCatalog.map((item) => {
                    const storeProduct = iapProductMap.get(item.sku);
                    const title = storeProduct?.title?.trim() || item.label;
                    const price =
                      storeProduct?.localizedPrice || storeProduct?.price || '';
                    const selected = item.sku === iapSelectedSku;
                    const label = price ? `${title} · ${price}` : title;
                    return (
                      <TouchableOpacity
                        key={item.sku}
                        onPress={() => {
                          setIapSelectedSku(item.sku);
                          setIapError(null);
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
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {iapError ? <Text style={styles.formError}>{iapError}</Text> : null}
              <View style={styles.buttonRow}>
                <MetalButton
                  title={iapLoading ? t('wallet.actions.starting') : t('wallet.actions.continue')}
                  onPress={handleSubmitIap}
                  disabled={iapLoading || iapRestoring || !iapSelectedSku || !iapReady}
                />
                <TouchableOpacity onPress={handleCloseIap} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={handleRestoreIapPurchases}
                style={styles.inlineLink}
                disabled={iapLoading || iapRestoring || !iapReady}
              >
                <Text style={styles.inlineLinkText}>
                  {iapRestoring ? t('wallet.actions.restoring') : t('wallet.actions.restore')}
                </Text>
              </TouchableOpacity>
            </MetalPanel>
          </View>
        </View>
      </Modal>

      <Modal
        visible={stripeVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseStripe}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseStripe} />
          <View style={styles.modalContent}>
            <MetalPanel glow style={styles.modalPanel}>
              <Text style={styles.modalTitle}>{t('wallet.stripe.title')}</Text>
              <Text style={styles.modalSubtitle}>{t('wallet.stripe.subtitle')}</Text>

              <Text style={styles.fieldLabel}>{t('wallet.checkout.currency')}</Text>
              <View style={styles.referenceList}>
                {STRIPE_CURRENCIES.map((currency) => {
                  const selected = currency === stripeCurrency;
                  return (
                    <TouchableOpacity
                      key={currency}
                      onPress={() => {
                        setStripeCurrency(currency);
                        setStripeError(null);
                        setStripeFieldErrors(null);
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
              {stripeCurrencyError ? (
                <Text style={styles.fieldError}>{stripeCurrencyError}</Text>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder={t('wallet.checkout.amountPlaceholder', { currency: stripeCurrency })}
                placeholderTextColor={theme.palette.graphite}
                value={stripeAmountInput}
                onChangeText={(text) => {
                  setStripeAmountInput(text);
                  setStripeError(null);
                  setStripeFieldErrors(null);
                }}
                keyboardType="decimal-pad"
              />
              {stripeAmountError ? (
                <Text style={styles.fieldError}>{stripeAmountError}</Text>
              ) : null}

              {stripeError ? <Text style={styles.formError}>{stripeError}</Text> : null}
              <View style={styles.buttonRow}>
                <MetalButton
                  title={
                    stripeLoading ? t('wallet.actions.starting') : t('wallet.actions.continue')
                  }
                  onPress={handleSubmitStripe}
                  disabled={stripeLoading || stripeAmountCents <= 0}
                />
                <TouchableOpacity onPress={handleCloseStripe} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </MetalPanel>
          </View>
        </View>
      </Modal>

      <Modal
        visible={btcpayVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseBtcpay}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseBtcpay} />
          <View style={styles.modalContent}>
            <MetalPanel glow style={styles.modalPanel}>
              <Text style={styles.modalTitle}>{t('wallet.btcpay.title')}</Text>
              <Text style={styles.modalSubtitle}>{t('wallet.btcpay.subtitle')}</Text>

              <Text style={styles.fieldLabel}>{t('wallet.checkout.currency')}</Text>
              <View style={styles.referenceList}>
                {BTCPAY_CURRENCIES.map((currency) => {
                  const selected = currency === btcpayCurrency;
                  return (
                    <TouchableOpacity
                      key={currency}
                      onPress={() => {
                        setBtcpayCurrency(currency);
                        setBtcpayError(null);
                        setBtcpayFieldErrors(null);
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
              {btcpayCurrencyError ? (
                <Text style={styles.fieldError}>{btcpayCurrencyError}</Text>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder={t('wallet.checkout.amountPlaceholder', { currency: btcpayCurrency })}
                placeholderTextColor={theme.palette.graphite}
                value={btcpayAmountInput}
                onChangeText={(text) => {
                  setBtcpayAmountInput(text);
                  setBtcpayError(null);
                  setBtcpayFieldErrors(null);
                }}
                keyboardType="decimal-pad"
              />
              {btcpayAmountError ? (
                <Text style={styles.fieldError}>{btcpayAmountError}</Text>
              ) : null}

              {btcpayError ? <Text style={styles.formError}>{btcpayError}</Text> : null}
              <View style={styles.buttonRow}>
                <MetalButton
                  title={
                    btcpayLoading ? t('wallet.actions.starting') : t('wallet.actions.continue')
                  }
                  onPress={handleSubmitBtcpay}
                  disabled={btcpayLoading || btcpayAmountCents <= 0}
                />
                <TouchableOpacity onPress={handleCloseBtcpay} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
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
              <Text style={styles.modalTitle}>{t('wallet.ipay.title')}</Text>
              <Text style={styles.modalSubtitle}>{t('wallet.ipay.subtitle')}</Text>

              <Text style={styles.fieldLabel}>{t('wallet.checkout.currency')}</Text>
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
                placeholder={t('wallet.checkout.amountPlaceholder', { currency: ipayCurrency })}
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
                  {t('wallet.ipay.notConfigured')}
                </Text>
              ) : null}

              {ipayError ? <Text style={styles.formError}>{ipayError}</Text> : null}
              <View style={styles.buttonRow}>
                <MetalButton
                  title={ipayLoading ? t('wallet.actions.starting') : t('wallet.actions.continue')}
                  onPress={handleSubmitIpay}
                  disabled={ipayLoading || ipayAmountCents <= 0 || !hasIpayBaseUrl}
                />
                <TouchableOpacity onPress={handleCloseIpay} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </MetalPanel>
          </View>
        </View>
      </Modal>
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
    inputRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    inputGrow: {
      flex: 1,
      marginBottom: 0,
    },
    pasteButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.palette.graphite,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    pasteLabel: {
      color: theme.palette.platinum,
      ...theme.typography.caption,
      fontWeight: '600',
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
    inlineLink: {
      alignSelf: 'flex-start',
      marginTop: theme.spacing.xs,
    },
    inlineLinkText: {
      color: theme.palette.azure,
      ...theme.typography.caption,
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
