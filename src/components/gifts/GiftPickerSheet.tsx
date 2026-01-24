import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { getSlcBalance, listSlcLedger } from '@api/coin';
import {
  GiftType,
  listGiftTypes,
  normalizeGiftApiError,
  sendCommentGift,
  sendPostGift,
} from '@api/gifts';
import { MetalButton } from '@components/MetalButton';
import { useToast } from '@context/ToastContext';
import { useAuthStore } from '@store/authStore';
import { theme } from '@theme';
import { usePressScaleAnimation } from '../../styles/animations';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.7);
const CLOSE_THRESHOLD = SHEET_HEIGHT * 0.25;
const CACHE_TTL = 5 * 60 * 1000;

type GiftTarget = {
  type: 'post' | 'comment';
  id: string;
};

type Props = {
  visible: boolean;
  target: GiftTarget | null;
  onClose: () => void;
  onGiftSent?: (
    gift: GiftType,
    quantity: number,
    status?: 'pending' | 'synced' | 'failed',
  ) => void;
};

let cachedGifts: GiftType[] | null = null;
let cachedAt = 0;

const createIdempotencyKey = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });

const formatPrice = (cents?: number) => {
  const value = typeof cents === 'number' ? cents : 0;
  return `${(value / 100).toFixed(2)} SLC`;
};

const clampQuantity = (value: number) => Math.max(1, Math.min(50, value));

const resolveGiftImage = (gift: GiftType) =>
  gift.media_url || gift.animation_url || '';

export function GiftPickerSheet({ visible, target, onClose, onGiftSent }: Props) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const logout = useAuthStore((state) => state.logout);
  const navigation = useNavigation<any>();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const closingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [giftTypes, setGiftTypes] = useState<GiftType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    translateY.setValue(SHEET_HEIGHT);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const now = Date.now();
    if (cachedGifts && now - cachedAt < CACHE_TTL) {
      setGiftTypes(cachedGifts);
      return;
    }
    setLoading(true);
    setError(null);
    listGiftTypes()
      .then((data) => {
        const active = data.filter((gift) => gift.is_active !== false);
        cachedGifts = active;
        cachedAt = Date.now();
        setGiftTypes(active);
      })
      .catch((err) => {
        console.warn('GiftPickerSheet: failed to load gifts', err);
        setError('Unable to load gifts.');
      })
      .finally(() => setLoading(false));
  }, [visible]);

  const closeSheet = useCallback(() => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      closingRef.current = false;
      onClose();
      setSelectedGift(null);
      setQuantity(1);
      setError(null);
      setInsufficientFunds(false);
    });
  }, [onClose, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > CLOSE_THRESHOLD || gesture.vy > 1.2) {
            closeSheet();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
            tension: 120,
          }).start();
        },
      }),
    [closeSheet, translateY],
  );

  const totalCents = (selectedGift?.price_slc_cents ?? 0) * quantity;
  const cooldownActive =
    cooldownUntil != null && cooldownUntil > Date.now() && !sending;

  const handleSendGift = useCallback(async () => {
    if (!target || !selectedGift || sending || cooldownActive) {
      return;
    }
    setSending(true);
    setError(null);
    setInsufficientFunds(false);
    const payload = {
      gift_type_id: selectedGift.id,
      quantity,
    };
    const idempotencyKey = createIdempotencyKey();
    try {
      if (target.type === 'post') {
        await sendPostGift(target.id, payload, idempotencyKey);
      } else {
        await sendCommentGift(target.id, payload, idempotencyKey);
      }
      onGiftSent?.(selectedGift, quantity, 'pending');
      let refreshOk = true;
      try {
        await Promise.all([
          getSlcBalance().catch(() => undefined),
          listSlcLedger().catch(() => undefined),
        ]);
      } catch (refreshError) {
        refreshOk = false;
        console.warn('GiftPickerSheet: refresh failed', refreshError);
      }
      if (!refreshOk) {
        toast.push({
          tone: 'info',
          message: 'Gift sent. Balance may take a moment to sync.',
        });
        onGiftSent?.(selectedGift, quantity, 'failed');
      } else {
        onGiftSent?.(selectedGift, quantity, 'synced');
      }
      toast.push({ tone: 'info', message: 'Gift sent.' });
      closeSheet();
    } catch (err) {
      const normalized = normalizeGiftApiError(err, 'Unable to send gift.');
      if (
        normalized.code === 'insufficient_funds' ||
        normalized.message.toLowerCase().includes('insufficient')
      ) {
        setInsufficientFunds(true);
      }
      if (normalized.status === 401 || normalized.status === 403) {
        toast.push({ tone: 'error', message: normalized.message });
        logout();
        setSending(false);
        return;
      }
      if (normalized.status === 429) {
        setCooldownUntil(Date.now() + 4000);
        toast.push({ tone: 'info', message: normalized.message });
      }
      setError(normalized.message);
    } finally {
      setSending(false);
    }
  }, [
    closeSheet,
    cooldownActive,
    logout,
    onGiftSent,
    quantity,
    selectedGift,
    sending,
    target,
    toast,
  ]);

  const handleBuySlc = useCallback(() => {
    closeSheet();
    navigation.navigate('WalletLedger');
  }, [closeSheet, navigation]);

  const renderGift = useCallback(
    ({ item }: { item: GiftType }) => (
      <GiftTile
        gift={item}
        selected={selectedGift?.id === item.id}
        onPress={() => setSelectedGift(item)}
      />
    ),
    [selectedGift?.id],
  );

  if (!visible || !target) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={closeSheet}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_HEIGHT,
            paddingBottom: Math.max(insets.bottom, 12),
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Send a Gift</Text>
          <TouchableOpacity onPress={closeSheet} hitSlop={10}>
            <Text style={styles.closeLabel}>✕</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.reels.textPrimary} />
          </View>
        ) : (
          <>
            <FlatList
              data={giftTypes}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderGift}
              numColumns={3}
              columnWrapperStyle={styles.column}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No gifts available yet.</Text>
              }
            />
            <View style={styles.footer}>
              <View style={styles.quantityRow}>
                <Text style={styles.quantityLabel}>Quantity</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity((value) => clampQuantity(value - 1))}
                    disabled={quantity <= 1}
                  >
                    <Text style={styles.quantityButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity((value) => clampQuantity(value + 1))}
                    disabled={quantity >= 50}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.totalText}>You will spend {formatPrice(totalCents)}</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {insufficientFunds ? (
                <MetalButton title="Buy SLC" onPress={handleBuySlc} />
              ) : (
                <MetalButton
                  title={sending ? 'Sending…' : 'Send Gift'}
                  onPress={handleSendGift}
                  disabled={!selectedGift || sending || cooldownActive}
                />
              )}
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.5)',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: theme.reels.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  closeLabel: {
    color: theme.reels.textSecondary,
    fontSize: 18,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    paddingBottom: 12,
  },
  column: {
    justifyContent: 'space-between',
    gap: 10,
  },
  tile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    padding: 8,
    marginBottom: 10,
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  tileSelected: {
    borderColor: theme.feed.accentCyan,
    shadowColor: theme.feed.accentCyan,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  tileMedia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  tilePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.18)',
  },
  tilePlaceholderText: {
    color: theme.reels.textPrimary,
    fontSize: 22,
  },
  tileName: {
    marginTop: 6,
    color: theme.reels.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  tilePrice: {
    color: theme.reels.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  tileBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(34,211,238,0.15)',
    color: theme.reels.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.25)',
    paddingTop: 10,
    gap: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    color: theme.reels.textSecondary,
    fontSize: 13,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(148,163,184,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: theme.reels.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  quantityValue: {
    color: theme.reels.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  totalText: {
    color: theme.reels.textSecondary,
    fontSize: 12,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
  },
  emptyText: {
    color: theme.reels.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
});

type GiftTileProps = {
  gift: GiftType;
  selected: boolean;
  onPress: () => void;
};

function GiftTile({ gift, selected, onPress }: GiftTileProps) {
  const press = usePressScaleAnimation(0.96);
  const imageUrl = resolveGiftImage(gift);
  const isAnimated = gift.kind === 'animated' || Boolean(gift.animation_url);
  return (
    <TouchableOpacity
      style={[styles.tile, selected && styles.tileSelected]}
      onPress={onPress}
      activeOpacity={0.9}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={press.style}>
        <View style={styles.tileMedia}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.tileImage} />
          ) : (
            <View style={styles.tilePlaceholder}>
              <Text style={styles.tilePlaceholderText}>★</Text>
            </View>
          )}
        </View>
        <Text style={styles.tileName} numberOfLines={1}>
          {gift.name}
        </Text>
        <Text style={styles.tilePrice}>{formatPrice(gift.price_slc_cents)}</Text>
        {isAnimated ? <Text style={styles.tileBadge}>Animated</Text> : null}
      </Animated.View>
    </TouchableOpacity>
  );
}
