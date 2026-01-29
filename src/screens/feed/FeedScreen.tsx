import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewToken,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedPostCard } from '@components/FeedPostCard';
import { MatrixFeedCard } from '@components/MatrixFeedCard';
import { MentorFeedCard } from '@components/MentorFeedCard';
import { InsightSkeleton } from '@components/skeleton/InsightSkeleton';
import { PostSkeleton } from '@components/skeleton/PostSkeleton';
import { SoulMatchSkeleton } from '@components/skeleton/SoulMatchSkeleton';
import { SoulMatchFeedCard } from '@components/SoulMatchFeedCard';
import { CommentsBottomSheet } from '@components/comments/CommentsBottomSheet';
import { GiftBurstOverlay } from '@components/gifts/GiftBurstOverlay';
import { GiftPickerSheet } from '@components/gifts/GiftPickerSheet';
import type { FeedItem, FeedMode } from '@schemas/feed';
import type { Post } from '@schemas/social';
import { connectRealtime, type RealtimePayload } from '@realtime/index';
import { useFeedStore } from '@store/feedStore';
import { useAuthStore } from '@store/authStore';
import { theme } from '@theme';
import { normalizeGiftRenderData, type GiftPreview } from '@utils/gifts';
import {
  filterActiveEffects,
  resolveActiveCardEffects,
  resolveEffectsFromGiftEvent,
} from '@utils/giftEffects';
import { createRealtimeDedupeStore } from '@utils/realtimeDedupe';
import { areStringArraysEqual, buildChannelList } from '@utils/realtimeChannels';
import { useGiftBurst } from '@hooks/useGiftBurst';

type FeedTab = FeedMode | 'reels';

export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const token = useAuthStore((state) => state.accessToken);
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  const currentMode = useFeedStore((state) => state.currentMode);
  const items = useFeedStore((state) => state.itemsByMode[state.currentMode]);
  const isLoading = useFeedStore((state) => state.isLoadingByMode[state.currentMode]);
  const isPaging = useFeedStore((state) => state.isPagingByMode[state.currentMode]);
  const error = useFeedStore((state) => state.errorByMode[state.currentMode]);
  const loadFeed = useFeedStore((state) => state.loadFeed);
  const dirtyByMode = useFeedStore((state) => state.dirtyByMode);
  const clearDirty = useFeedStore((state) => state.clearDirty);
  const loadMore = useFeedStore((state) => state.loadMore);
  const setMode = useFeedStore((state) => state.setMode);
  const listRef = useRef<FlatList<FeedItem>>(null);
  const scrollOffsets = useRef<Record<FeedMode, number>>({ for_you: 0, following: 0 });
  const [activeTab, setActiveTab] = useState<FeedTab>(currentMode);
  const activeTabRef = useRef<FeedTab>(currentMode);
  const tabIndex = useMemo(() => ({ for_you: 0, following: 1, reels: 2 }), []);
  const indicator = useRef(new Animated.Value(tabIndex[currentMode])).current;
  const [segmentWidth, setSegmentWidth] = useState(0);
  const showFab = useMemo(() => items.some((item) => item.type === 'post'), [items]);
  const [activeVideoPostId, setActiveVideoPostId] = useState<string | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [giftPost, setGiftPost] = useState<Post | null>(null);
  const [giftCountsByPost, setGiftCountsByPost] = useState<Record<string, number>>(
    {},
  );
  const [giftSyncByPost, setGiftSyncByPost] = useState<Record<string, boolean>>({});
  const [giftRecentByPost, setGiftRecentByPost] = useState<
    Record<string, GiftPreview[]>
  >({});
  const [giftEffectsByPost, setGiftEffectsByPost] = useState<Record<string, any>>(
    {},
  );
  const { burst, triggerGiftBurst, clearGiftBurst } = useGiftBurst();
  const giftRealtimeRef = useRef<ReturnType<typeof connectRealtime> | null>(null);
  const giftDedupeRef = useRef(createRealtimeDedupeStore(200));
  const warnedMissingEffectsRef = useRef(false);
  const [visibleGiftChannels, setVisibleGiftChannels] = useState<string[]>([]);
  const visibleGiftChannelsRef = useRef<string[]>([]);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [isAppActive, setIsAppActive] = useState(appStateRef.current === 'active');
  const videoExtraData = useMemo(
    () => ({ activeVideoPostId, isFocused }),
    [activeVideoPostId, giftCountsByPost, handleOpenComments, handleOpenGiftPicker, isFocused],
  );
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  });

  useEffect(() => {
    loadFeed().catch(() => undefined);
  }, [loadFeed]);

  useFocusEffect(
    useCallback(() => {
      const mode = currentMode;
      if (!dirtyByMode[mode]) {
        return;
      }
      clearDirty(mode);
      loadFeed(mode).catch(() => undefined);
    }, [clearDirty, currentMode, dirtyByMode, loadFeed]),
  );

  useEffect(() => {
    Animated.timing(indicator, {
      toValue: tabIndex[activeTab],
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [activeTab, indicator, tabIndex]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const offset = scrollOffsets.current[currentMode] ?? 0;
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset, animated: false });
    });
  }, [currentMode]);

  useEffect(() => {
    if (activeTabRef.current === 'reels') {
      return;
    }
    setActiveTab(currentMode);
  }, [currentMode]);

  useEffect(() => {
    if (!isFocused) {
      setActiveVideoPostId(null);
    }
  }, [isFocused]);

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

  const handleModeChange = useCallback(
    (mode: FeedMode) => {
      if (mode === currentMode) {
        return;
      }
      setActiveTab(mode);
      setMode(mode);
      Haptics.selectionAsync().catch(() => undefined);
    },
    [currentMode, setMode],
  );

  const handleReelsPress = useCallback(() => {
    setActiveTab('reels');
    Haptics.selectionAsync().catch(() => undefined);
    navigation.navigate('SoulReels');
  }, [navigation]);

  const handleOpenComments = useCallback((post: Post) => {
    setCommentPost(post);
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentPost(null);
  }, []);

  const handleOpenGiftPicker = useCallback((post: Post) => {
    setGiftPost(post);
  }, []);

  const handleCloseGiftPicker = useCallback(() => {
    setGiftPost(null);
  }, []);

  const handleGiftSent = useCallback(
    (gift, quantity: number, status?: 'pending' | 'synced' | 'failed') => {
      const key = String(giftPost?.id ?? '');
      if (!key) {
        return;
      }
      if (status === 'pending') {
        if (gift) {
          triggerGiftBurst(gift);
        }
        setGiftCountsByPost((prev) => {
          const current = prev[key] ?? 0;
          return { ...prev, [key]: current + quantity };
        });
        setGiftRecentByPost((prev) => {
          const current = prev[key] ?? [];
          return {
            ...prev,
            [key]: gift
              ? [gift as any, ...current].slice(0, 4)
              : current,
          };
        });
        setGiftSyncByPost((prev) => ({ ...prev, [key]: true }));
        return;
      }
      if (status === 'synced' || status === 'failed') {
        setGiftSyncByPost((prev) => ({ ...prev, [key]: false }));
      }
    },
    [giftPost?.id, triggerGiftBurst],
  );

  useEffect(() => {
    return () => {
      clearGiftBurst();
    };
  }, [clearGiftBurst]);

  useEffect(() => {
    setGiftCountsByPost((prev) => {
      let changed = false;
      const next = { ...prev };
      items.forEach((item) => {
        if (item.type !== 'post') {
          return;
        }
        const key = String(item.post.id);
        if (next[key] != null) {
          return;
        }
        const normalized = normalizeGiftRenderData(item.post as unknown);
        if (normalized.totalCount > 0) {
          next[key] = normalized.totalCount;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    setGiftRecentByPost((prev) => {
      let changed = false;
      const next = { ...prev };
      items.forEach((item) => {
        if (item.type !== 'post') {
          return;
        }
        const key = String(item.post.id);
        if (next[key]?.length) {
          return;
        }
        const normalized = normalizeGiftRenderData(item.post as unknown);
        if (normalized.recent.length > 0) {
          next[key] = normalized.recent.slice(0, 4);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items]);

  const giftChannelsKey = useMemo(
    () => visibleGiftChannels.join(','),
    [visibleGiftChannels],
  );

  const updateGiftChannels = useCallback((postIds: string[]) => {
    const nextChannels = buildChannelList(
      postIds.filter(Boolean).map((id) => `post:${id}`),
    );
    if (areStringArraysEqual(visibleGiftChannelsRef.current, nextChannels)) {
      return;
    }
    visibleGiftChannelsRef.current = nextChannels;
    setVisibleGiftChannels(nextChannels);
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
      if (!target || target.type !== 'post') {
        return;
      }
      const targetId = target.id != null ? String(target.id) : '';
      if (!targetId) {
        return;
      }
      const eventId = record.id as string | number | null | undefined;
      if (!giftDedupeRef.current.add(eventId)) {
        return;
      }
      const sender = record.sender as { id?: number } | undefined;
      const giftType = record.gift_type as GiftPreview | undefined;
      const quantity =
        typeof record.quantity === 'number' ? record.quantity : 1;
      const serverTime = record.server_time as string | number | undefined;
      const expiresAt = record.expires_at as string | number | undefined;

      if (sender?.id != null && currentUserId != null && sender.id === currentUserId) {
        return;
      }

      if (giftType) {
        triggerGiftBurst(giftType);
      }

      if (giftType && (giftType as any).effects) {
        const effects = resolveEffectsFromGiftEvent({
          giftType,
          createdAt: record.created_at as string | number | undefined,
          targetType: 'post',
          serverTime,
          expiresAt,
        });
        if (Object.keys(effects).length) {
          setGiftEffectsByPost((prev) => ({ ...prev, [targetId]: effects }));
        }
      } else if (__DEV__ && !warnedMissingEffectsRef.current) {
        warnedMissingEffectsRef.current = true;
        // eslint-disable-next-line no-console
        console.warn('[GiftRealtime] gift_type.effects missing in event payload.');
      }

      setGiftCountsByPost((prev) => {
        const current = prev[targetId] ?? 0;
        return { ...prev, [targetId]: current + quantity };
      });
      setGiftRecentByPost((prev) => {
        const current = prev[targetId] ?? [];
        return {
          ...prev,
          [targetId]: giftType ? [giftType, ...current].slice(0, 4) : current,
        };
      });
    },
    [currentUserId, triggerGiftBurst],
  );

  useEffect(() => {
    if (!token || !isFocused || !isAppActive || visibleGiftChannels.length === 0) {
      giftRealtimeRef.current?.disconnect();
      giftRealtimeRef.current = null;
      return;
    }
    giftRealtimeRef.current?.disconnect();
    const connection = connectRealtime(token, { channels: visibleGiftChannels });
    giftRealtimeRef.current = connection;
    const unsubscribe = connection.subscribe(handleGiftRealtime);
    return () => {
      unsubscribe();
      connection.disconnect();
    };
  }, [giftChannelsKey, handleGiftRealtime, isAppActive, isFocused, token, visibleGiftChannels]);

  useEffect(() => {
    if (isFocused && activeTab === 'reels') {
      setActiveTab(currentMode);
    }
  }, [activeTab, currentMode, isFocused]);

  const activeHighlight = useMemo(() => {
    switch (activeTab) {
      case 'following':
        return [theme.palette.graphite, theme.feed.textPrimary] as const;
      case 'reels':
        return [theme.feed.accentCyan, theme.colors.secondary] as const;
      default:
        return [theme.feed.accentBlue, theme.feed.accentCyan] as const;
    }
  }, [activeTab]);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      switch (item.type) {
        case 'post': {
          const now = Date.now();
          const realtimeEffects = filterActiveEffects(
            giftEffectsByPost[String(item.post.id)],
            now,
          );
          const fallbackEffects = resolveActiveCardEffects({
            now,
            recentGifts: (item.post as any)?.recent_gifts ?? [],
            targetType: 'post',
          });
          const giftEffects = realtimeEffects ?? fallbackEffects;
          return (
            <FeedPostCard
              post={item.post}
              shouldPlayVideo={
                isFocused &&
                Boolean(item.post.video?.url) &&
                String(item.post.id) === String(activeVideoPostId ?? '')
              }
              isFeedFocused={isFocused}
              onCommentPress={handleOpenComments}
              onGiftPress={handleOpenGiftPicker}
              giftCount={giftCountsByPost[String(item.post.id)] ?? 0}
              giftSyncing={giftSyncByPost[String(item.post.id)] ?? false}
              giftPreviews={giftRecentByPost[String(item.post.id)] ?? []}
              giftEffects={giftEffects}
            />
          );
        }
        case 'mentor_insight':
          return <MentorFeedCard data={item.mentor} />;
        case 'matrix_insight':
          return <MatrixFeedCard data={item.matrix} />;
        case 'soulmatch_reco':
          return <SoulMatchFeedCard data={item.soulmatch} />;
        default:
          return null;
      }
    },
    [activeVideoPostId, isFocused],
  );

  const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return null;
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No posts yet</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.primaryButtonLabel}>Create your first post</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading, navigation]);

  const showInitialSkeleton = isLoading && items.length === 0;

  const renderSkeletons = useCallback(() => {
    return (
      <View style={styles.skeletonList}>
        {Array.from({ length: 4 }).map((_, index) => (
          <PostSkeleton key={`post-skel-${index}`} hasMedia={index % 2 === 0} />
        ))}
        <InsightSkeleton />
        <SoulMatchSkeleton />
      </View>
    );
  }, []);

  const renderFooter = useCallback(() => {
    if (!isPaging) {
      return null;
    }
    return (
      <View style={styles.footerSkeletons}>
        <PostSkeleton hasMedia={false} />
      </View>
    );
  }, [isPaging]);

  const errorContent =
    error && items.length === 0 ? (
      <View style={styles.errorState}>
        <LinearGradient
          colors={theme.gradients.nebulaPurple}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.errorCard}
        >
          <Text style={styles.errorTitle}>We lost the signal</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadFeed()}>
            <Text style={styles.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    ) : null;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<ViewToken<FeedItem>> }) => {
      if (!isFocused) {
        return;
      }
      const visiblePosts = viewableItems
        .filter((token) => token.isViewable && token.item?.type === 'post')
        .map((token) => {
          if (token.item?.type !== 'post') {
            return null;
          }
          const postId = token.item.post.id;
          return postId ? String(postId) : null;
        })
        .filter((id): id is string => Boolean(id));

      updateGiftChannels(visiblePosts);

      const visibleVideos = viewableItems
        .filter(
          (token) =>
            token.isViewable &&
            token.item?.type === 'post' &&
            Boolean((token.item as any)?.post?.video?.url),
        )
        .map((token) => {
          if (token.item?.type !== 'post') {
            return { id: null, index: token.index ?? 0 };
          }
          const postId = token.item.post.id;
          return {
            id: postId ? String(postId) : null,
            index: token.index ?? 0,
          };
        })
        .filter((item) => item.id !== null);

      if (!visibleVideos.length) {
        setActiveVideoPostId(null);
        return;
      }
      const next = visibleVideos.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];
      setActiveVideoPostId((prev) => (prev === next.id ? prev : (next.id as string)));
    },
    [isFocused, updateGiftChannels],
  );

  const tabs = useMemo(
    () => [
      {
        key: 'for_you' as FeedTab,
        label: 'For You',
        onPress: () => handleModeChange('for_you'),
      },
      {
        key: 'following' as FeedTab,
        label: 'Following',
        onPress: () => handleModeChange('following'),
      },
      { key: 'reels' as FeedTab, label: 'Reels', onPress: handleReelsPress },
    ],
    [handleModeChange, handleReelsPress],
  );

  return (
    <LinearGradient
      colors={[theme.feed.backgroundStart, theme.feed.backgroundEnd]}
      style={styles.container}
    >
      <LinearGradient
        colors={['rgba(59,130,246,0.22)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.halo}
        pointerEvents="none"
      />
      <View style={styles.content}>
        <View style={[styles.headerArea, { paddingTop: insets.top + 6 }]}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Feed</Text>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => navigation.navigate('SearchProfiles')}
              activeOpacity={0.9}
            >
              <Ionicons name="search" size={18} style={styles.searchIcon} />
            </TouchableOpacity>
          </View>

          <View style={styles.modeSwitch}>
            <View
              style={styles.modeTrack}
              pointerEvents="none"
              onLayout={(event) => setSegmentWidth(event.nativeEvent.layout.width / 3)}
            >
              <Animated.View
                style={[
                  styles.modeIndicator,
                  {
                    width: segmentWidth || '33.33%',
                    transform: [
                      {
                        translateX: indicator.interpolate({
                          inputRange: [0, 1, 2],
                          outputRange: [0, segmentWidth || 0, (segmentWidth || 0) * 2],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={activeHighlight}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modeIndicatorGradient}
                />
              </Animated.View>
            </View>
            <View style={styles.modeRow}>
              {tabs.map(({ key, label, onPress }) => {
                const active = activeTab === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.modeButton}
                    onPress={onPress}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <LinearGradient
            colors={['transparent', theme.feed.border, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dividerGlow}
          />
        </View>

        {showInitialSkeleton ? (
          renderSkeletons()
        ) : errorContent ? (
          errorContent
        ) : (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              showFab && styles.listContentWithFab,
            ]}
            ItemSeparatorComponent={renderSeparator}
            refreshControl={
              <RefreshControl
                refreshing={isLoading && items.length > 0}
                onRefresh={loadFeed}
                tintColor={theme.feed.accentBlue}
                colors={[theme.feed.accentBlue, theme.feed.accentCyan]}
                progressBackgroundColor="rgba(34,211,238,0.08)"
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onScroll={(event) => {
              scrollOffsets.current[currentMode] = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig.current}
            extraData={videoExtraData}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      {showFab ? (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : null}
      {commentPost ? (
        <CommentsBottomSheet
          targetType="post"
          targetId={String(commentPost.id)}
          initialCommentCount={commentPost.comment_count}
          onClose={handleCloseComments}
        />
      ) : null}
      <GiftPickerSheet
        visible={Boolean(giftPost)}
        target={giftPost ? { type: 'post', id: String(giftPost.id) } : null}
        onClose={handleCloseGiftPicker}
        onGiftSent={handleGiftSent}
      />
      <GiftBurstOverlay
        visible={Boolean(burst)}
        gift={burst?.gift ?? null}
        burstKey={burst?.key}
        onComplete={clearGiftBurst}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.feed.backgroundEnd,
  },
  halo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 260,
    opacity: 0.55,
  },
  content: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: theme.feed.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  searchButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.14)',
    borderWidth: 1,
    borderColor: theme.feed.border,
    shadowColor: theme.feed.accentBlue,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  searchIcon: {
    color: theme.feed.accentBlue,
  },
  modeSwitch: {
    marginTop: 14,
    borderRadius: 22,
    padding: 6,
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    overflow: 'hidden',
  },
  modeTrack: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 6,
    right: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  modeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    shadowColor: theme.feed.accentBlue,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  modeIndicatorGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeLabel: {
    color: theme.feed.textMuted,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modeLabelActive: {
    color: theme.feed.textPrimary,
  },
  dividerGlow: {
    height: 1,
    marginTop: 14,
    marginHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  listContentWithFab: {
    paddingBottom: 140,
  },
  separator: {
    height: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.feed.textPrimary,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: theme.feed.accentBlue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: theme.feed.accentBlue,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  primaryButtonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.feed.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.feed.accentBlue,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  fabText: {
    color: '#fff',
    fontSize: 30,
    marginTop: -2,
  },
  skeletonList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerSkeletons: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorState: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: theme.feed.glass,
    borderWidth: 1,
    borderColor: theme.feed.border,
  },
  errorTitle: {
    color: theme.feed.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorSubtitle: {
    color: theme.feed.textMuted,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: theme.feed.accentCyan,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  retryLabel: {
    color: '#0B1120',
    fontWeight: '700',
  },
});
