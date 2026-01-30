import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewToken,
  View,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { likeComment, normalizeLikesApiError, unlikeComment } from '@api/likes';
import { GiftPickerSheet } from '@components/gifts/GiftPickerSheet';
import { GiftBurstOverlay } from '@components/gifts/GiftBurstOverlay';
import { useToast } from '@context/ToastContext';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';
import { normalizeGiftRenderData } from '@utils/gifts';
import {
  filterActiveEffects,
  resolveActiveCardEffects,
  resolveEffectsFromGiftEvent,
} from '@utils/giftEffects';
import { createRealtimeDedupeStore } from '@utils/realtimeDedupe';
import { areStringArraysEqual, buildChannelList } from '@utils/realtimeChannels';
import { useGiftBurst } from '@hooks/useGiftBurst';
import { connectRealtime, type RealtimePayload } from '@realtime/index';

import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';
import type { CommentTargetType, CommentWithOptimistic } from './types';
import { useCommentsController } from './useCommentsController';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.78);
const CLOSE_THRESHOLD = SHEET_HEIGHT * 0.22;

type Props = {
  targetType: CommentTargetType;
  targetId: string;
  initialCommentCount?: number;
  headerTitle?: string;
  onClose?: () => void;
  onCommentCountChange?: (count: number) => void;
};

export function CommentsBottomSheet({
  targetType,
  targetId,
  initialCommentCount,
  headerTitle = 'Comments',
  onClose,
  onCommentCountChange,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const currentUser = useAuthStore((state) => state.currentUser);
  const token = useAuthStore((state) => state.accessToken);
  const logout = useAuthStore((state) => state.logout);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const closingRef = useRef(false);
  const [commentReactions, setCommentReactions] = useState<
    Record<
      string,
      {
        liked: boolean;
        likeCount: number;
        giftCount: number;
        giftPreviews?: ReturnType<typeof normalizeGiftRenderData>['recent'];
      }
    >
  >({});
  const [giftSyncByComment, setGiftSyncByComment] = useState<Record<string, boolean>>(
    {},
  );
  const [commentEffects, setCommentEffects] = useState<Record<string, any>>({});
  const [giftTargetId, setGiftTargetId] = useState<string | null>(null);
  const { burst, triggerGiftBurst, clearGiftBurst } = useGiftBurst();
  const commentLikeCooldownRef = useRef<Record<string, number>>({});
  const commentLikePendingRef = useRef<Record<string, boolean>>({});
  const realtimeRef = useRef<ReturnType<typeof connectRealtime> | null>(null);
  const giftDedupeRef = useRef(createRealtimeDedupeStore(200));
  const warnedMissingEffectsRef = useRef(false);
  const [visibleCommentChannels, setVisibleCommentChannels] = useState<string[]>([]);
  const visibleCommentChannelsRef = useRef<string[]>([]);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [isAppActive, setIsAppActive] = useState(appStateRef.current === 'active');
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  });

  const {
    comments,
    loading,
    loadingMore,
    refreshing,
    error,
    input,
    setInput,
    submitComment,
    refresh,
    loadMore,
    canSubmit,
    submitting,
  } = useCommentsController({
    targetId,
    initialCommentCount,
    onCommentCountChange,
  });

  useEffect(() => {
    setCommentReactions((prev) => {
      let changed = false;
      const next = { ...prev };
      comments.forEach((comment) => {
        const key = String(comment.id);
        if (next[key]) {
          return;
        }
        const baseLiked = Boolean(
          (comment as any)?.viewer_has_liked ?? (comment as any)?.liked,
        );
        const baseCount =
          typeof (comment as any)?.like_count === 'number'
            ? Number((comment as any).like_count)
            : 0;
        const giftRender = normalizeGiftRenderData(comment as unknown);
        next[key] = {
          liked: baseLiked,
          likeCount: baseCount,
          giftCount: giftRender.totalCount,
          giftPreviews: giftRender.recent.slice(0, 3),
        };
        changed = true;
      });
      return changed ? next : prev;
    });
  }, [comments]);

  const commentChannelsKey = useMemo(
    () => visibleCommentChannels.join(','),
    [visibleCommentChannels],
  );

  const updateCommentChannels = useCallback((commentIds: string[]) => {
    const nextChannels = buildChannelList(
      commentIds.filter(Boolean).map((id) => `comment:${id}`),
    );
    if (areStringArraysEqual(visibleCommentChannelsRef.current, nextChannels)) {
      return;
    }
    visibleCommentChannelsRef.current = nextChannels;
    setVisibleCommentChannels(nextChannels);
  }, []);

  const handleGiftRealtime = useCallback(
    (payload: RealtimePayload) => {
      if (!payload || typeof payload !== 'object') {
        return;
      }
      const record = payload as Record<string, unknown>;
      if (record.type !== 'gift.received') {
        return;
      }
      const target = record.target as { type?: string; id?: unknown } | undefined;
      if (!target || target.type !== 'comment') {
        return;
      }
      const commentId = target.id != null ? String(target.id) : '';
      if (!commentId) {
        return;
      }
      const eventId = record.id as string | number | null | undefined;
      if (!giftDedupeRef.current.add(eventId)) {
        return;
      }
      const sender = record.sender as { id?: number } | undefined;
      const giftType = record.gift_type as any;
      const quantity =
        typeof record.quantity === 'number' ? record.quantity : 1;
      const serverTime = record.server_time as string | number | undefined;
      const expiresAt = record.expires_at as string | number | undefined;

      if (sender?.id != null && currentUser?.id != null && sender.id === currentUser.id) {
        return;
      }

      if (giftType) {
        triggerGiftBurst(giftType);
      }

      if (giftType && (giftType as any).effects) {
        const effects = resolveEffectsFromGiftEvent({
          giftType,
          createdAt: record.created_at as string | number | undefined,
          targetType: 'comment',
          serverTime,
          expiresAt,
        });
        if (Object.keys(effects).length) {
          setCommentEffects((prev) => ({ ...prev, [commentId]: effects }));
        }
      } else if (__DEV__ && !warnedMissingEffectsRef.current) {
        warnedMissingEffectsRef.current = true;
        // eslint-disable-next-line no-console
        console.warn('[GiftRealtime] gift_type.effects missing in event payload.');
      }

      setCommentReactions((prev) => {
        const current = prev[commentId] ?? { liked: false, likeCount: 0, giftCount: 0 };
        return {
          ...prev,
          [commentId]: {
            ...current,
            giftCount: current.giftCount + quantity,
            giftPreviews: giftType
              ? [giftType, ...(current.giftPreviews ?? []).slice(0, 2)]
              : current.giftPreviews,
          },
        };
      });
    },
    [currentUser?.id, triggerGiftBurst],
  );

  useEffect(() => {
    if (!token || !isAppActive || visibleCommentChannels.length === 0) {
      realtimeRef.current?.disconnect();
      realtimeRef.current = null;
      return;
    }
    realtimeRef.current?.disconnect();
    const connection = connectRealtime(token, { channels: visibleCommentChannels });
    realtimeRef.current = connection;
    const unsubscribe = connection.subscribe(handleGiftRealtime);
    return () => {
      unsubscribe();
      connection.disconnect();
    };
  }, [commentChannelsKey, handleGiftRealtime, isAppActive, token, visibleCommentChannels]);

  useEffect(() => {
    const handleAppStateChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && prev !== 'active') {
        setIsAppActive(true);
        return;
      }
      if (next !== 'active') {
        setIsAppActive(false);
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    translateY.setValue(SHEET_HEIGHT);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [targetId, translateY]);

  const closeSheet = useCallback(() => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      closingRef.current = false;
      onClose?.();
      setGiftTargetId(null);
    });
  }, [onClose, translateY]);

  useEffect(() => {
    return () => {
      clearGiftBurst();
    };
  }, [clearGiftBurst]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          return Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
        },
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

  const handleAuthError = useCallback(
    (message: string) => {
      toast.push({ tone: 'error', message });
      logout();
    },
    [logout, toast],
  );

  const handleToggleCommentLike = useCallback(
    async (commentId: string | number) => {
      const key = String(commentId);
      const now = Date.now();
      if ((commentLikeCooldownRef.current[key] ?? 0) + 800 > now) {
        return;
      }
      if (commentLikePendingRef.current[key]) {
        return;
      }
      commentLikeCooldownRef.current[key] = now;
      commentLikePendingRef.current[key] = true;
      const current = commentReactions[key] ?? {
        liked: false,
        likeCount: 0,
        giftCount: 0,
      };
      const nextLiked = !current.liked;
      const nextCount = Math.max(0, current.likeCount + (nextLiked ? 1 : -1));
      setCommentReactions((prev) => ({
        ...prev,
        [key]: { ...current, liked: nextLiked, likeCount: nextCount },
      }));
      try {
        const response = nextLiked
          ? await likeComment(commentId)
          : await unlikeComment(commentId);
        setCommentReactions((prev) => ({
          ...prev,
          [key]: {
            ...current,
            liked: response.liked,
            likeCount: response.like_count,
          },
        }));
      } catch (err) {
        const normalized = normalizeLikesApiError(err, 'Unable to update like.');
        if (normalized.status === 401 || normalized.status === 403) {
          handleAuthError(normalized.message);
          return;
        }
        setCommentReactions((prev) => ({
          ...prev,
          [key]: current,
        }));
        toast.push({ tone: 'error', message: normalized.message });
      } finally {
        commentLikePendingRef.current[key] = false;
      }
    },
    [commentReactions, handleAuthError, toast],
  );

  const handleOpenGiftPicker = useCallback((commentId: string | number) => {
    setGiftTargetId(String(commentId));
  }, []);

  const handleGiftSent = useCallback(
    (gift, quantity: number, status?: 'pending' | 'synced' | 'failed') => {
      if (!giftTargetId) {
        return;
      }
      if (status === 'pending') {
        if (gift) {
          triggerGiftBurst(gift);
        }
        setCommentReactions((prev) => {
          const current = prev[giftTargetId] ?? {
            liked: false,
            likeCount: 0,
            giftCount: 0,
          };
          return {
            ...prev,
            [giftTargetId]: {
              ...current,
              giftCount: current.giftCount + quantity,
              giftPreviews: gift
                ? [
                    gift as any,
                    ...(current.giftPreviews ?? []).slice(0, 2),
                  ]
                : current.giftPreviews,
            },
          };
        });
        setGiftSyncByComment((prev) => ({ ...prev, [giftTargetId]: true }));
        return;
      }
      if (status === 'synced' || status === 'failed') {
        setGiftSyncByComment((prev) => ({ ...prev, [giftTargetId]: false }));
      }
    },
    [giftTargetId, triggerGiftBurst],
  );

  const renderItem = useCallback(
    ({ item }: { item: CommentWithOptimistic }) => {
      const key = String(item.id);
      const reaction = commentReactions[key];
      const now = Date.now();
      const realtimeEffects = filterActiveEffects(
        commentEffects[key],
        now,
      );
      const fallbackEffects = resolveActiveCardEffects({
        now,
        recentGifts: (item as any)?.recent_gifts ?? [],
        targetType: 'comment',
      });
      const giftEffects = realtimeEffects ?? fallbackEffects;
      return (
        <CommentItem
          comment={item}
          liked={reaction?.liked}
          likeCount={reaction?.likeCount ?? 0}
          giftCount={reaction?.giftCount ?? 0}
          giftPreviews={reaction?.giftPreviews ?? []}
          giftSyncing={giftSyncByComment[key] ?? false}
          giftEffects={giftEffects}
          onLikePress={() => handleToggleCommentLike(item.id)}
          onGiftPress={() => handleOpenGiftPicker(item.id)}
        />
      );
    },
    [
      commentReactions,
      giftSyncByComment,
      handleOpenGiftPicker,
      handleToggleCommentLike,
    ],
  );

  const avatarLabel = currentUser?.name ?? 'You';
  const avatarUrl = currentUser?.photo ?? null;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<ViewToken<CommentWithOptimistic>> }) => {
      if (!isAppActive) {
        return;
      }
      const visibleIds = viewableItems
        .filter((token) => token.isViewable)
        .map((token) => {
          const id = token.item?.id;
          return id != null ? String(id) : null;
        })
        .filter((id): id is string => Boolean(id));
      updateCommentChannels(visibleIds);
    },
    [isAppActive, updateCommentChannels],
  );

  return (
    <Modal transparent visible animationType="none" onRequestClose={closeSheet}>
      <TouchableWithoutFeedback onPress={closeSheet}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.wrapper}
        keyboardVerticalOffset={insets.top + 12}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_HEIGHT,
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <Text style={styles.title}>{headerTitle}</Text>
            <TouchableOpacity onPress={closeSheet} hitSlop={10}>
              <Text style={styles.closeLabel}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listContainer}>
            {loading ? (
              <View style={styles.loader}>
                <ActivityIndicator color={theme.reels.textPrimary} />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={[
                  styles.commentsList,
                  comments.length === 0 && styles.commentsListEmpty,
                ]}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Be the first to comment</Text>
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.4}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.loader}>
                      <ActivityIndicator color={theme.reels.textPrimary} />
                    </View>
                  ) : null
                }
                refreshing={refreshing}
                onRefresh={refresh}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig.current}
              />
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
          <CommentComposer
            value={input}
            onChangeText={setInput}
            onSubmit={submitComment}
            disabled={!canSubmit}
            pending={submitting}
            avatarLabel={avatarLabel}
            avatarUrl={avatarUrl}
            placeholder={`Add a comment to this ${targetType}…`}
          />
        </Animated.View>
      </KeyboardAvoidingView>
      <GiftPickerSheet
        visible={Boolean(giftTargetId)}
        target={giftTargetId ? { type: 'comment', id: giftTargetId } : null}
        onClose={() => setGiftTargetId(null)}
        onGiftSent={handleGiftSent}
      />
      <GiftBurstOverlay
        visible={Boolean(burst)}
        gift={burst?.gift ?? null}
        burstKey={burst?.key}
        onComplete={clearGiftBurst}
      />
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
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
  listContainer: {
    flex: 1,
    paddingBottom: 6,
  },
  commentsList: {
    paddingBottom: 12,
  },
  commentsListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loader: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.reels.textSecondary,
  },
  errorText: {
    color: '#FCA5A5',
    marginTop: 6,
    fontSize: 12,
  },
  });
