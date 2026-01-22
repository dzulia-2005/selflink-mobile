import { useIsFocused, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommentsBottomSheet } from '@components/comments/CommentsBottomSheet';
import { SoulReelItem } from '@components/SoulReelItem';
import type { Post } from '@schemas/social';
import type { VideoFeedItem } from '@schemas/videoFeed';
import { useFeedStore } from '@store/feedStore';
import { useVideoFeedStore } from '@store/videoFeedStore';
import { theme } from '@theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const useSafeNavigation = <T,>() => {
  try {
    return useNavigation<T>();
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('SoulReelsScreen: navigation unavailable', err);
    }
    return null as unknown as T;
  }
};

const useSafeIsFocused = () => {
  try {
    return useIsFocused();
  } catch {
    return true;
  }
};

export function SoulReelsScreen() {
  const navigation = useSafeNavigation<any>();
  const isFocused = useSafeIsFocused();
  const insets = useSafeAreaInsets();
  const likePost = useFeedStore((state) => state.likePost);
  const unlikePost = useFeedStore((state) => state.unlikePost);
  const pendingLikes = useRef<Set<string>>(new Set());
  const currentMode = useVideoFeedStore((state) => state.currentMode);
  const itemsByMode = useVideoFeedStore((state) => state.itemsByMode);
  const nextByMode = useVideoFeedStore((state) => state.nextByMode);
  const isLoadingByMode = useVideoFeedStore((state) => state.isLoadingByMode);
  const isPagingByMode = useVideoFeedStore((state) => state.isPagingByMode);
  const errorByMode = useVideoFeedStore((state) => state.errorByMode);
  const fetchFirstPage = useVideoFeedStore((state) => state.fetchFirstPage);
  const fetchNextPage = useVideoFeedStore((state) => state.fetchNextPage);
  const setMode = useVideoFeedStore((state) => state.setMode);
  const items = useMemo(() => itemsByMode[currentMode] ?? [], [currentMode, itemsByMode]);
  const nextCursor = useMemo(() => nextByMode[currentMode], [currentMode, nextByMode]);
  const isLoading = useMemo(
    () => isLoadingByMode[currentMode],
    [currentMode, isLoadingByMode],
  );
  const isPaging = useMemo(
    () => isPagingByMode[currentMode],
    [currentMode, isPagingByMode],
  );
  const error = useMemo(() => errorByMode[currentMode], [currentMode, errorByMode]);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [muted, setMuted] = useState(true);
  const [engagementById, setEngagementById] = useState<
    Record<string, { liked: boolean; likeCount: number; commentCount: number }>
  >({});
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  });

  useEffect(() => {
    fetchFirstPage().catch(() => undefined);
  }, [fetchFirstPage]);

  useEffect(() => {
    setEngagementById((prev) => {
      let changed = false;
      const nextState = { ...prev };
      items.forEach((item) => {
        const key = String(item.id);
        const nextValue = {
          liked: item.post.liked,
          likeCount: item.post.like_count,
          commentCount: item.post.comment_count,
        };
        const current = prev[key];
        if (
          !current ||
          current.liked !== nextValue.liked ||
          current.likeCount !== nextValue.likeCount ||
          current.commentCount !== nextValue.commentCount
        ) {
          nextState[key] = nextValue;
          changed = true;
        }
      });
      return changed ? nextState : prev;
    });
  }, [items]);

  useEffect(() => {
    if (!isFocused) {
      setActiveId(null);
      setCommentPost(null);
    }
  }, [isFocused]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<ViewToken<VideoFeedItem>> }) => {
      if (!isFocused) {
        return;
      }
      const visible = viewableItems.find((item) => item.isViewable);
      if (visible?.item?.id !== undefined) {
        setActiveId(String(visible.item.id));
      }
    },
    [isFocused],
  );

  const loadNextPage = useCallback(() => {
    if (!nextCursor) {
      return;
    }
    fetchNextPage().catch(() => undefined);
  }, [fetchNextPage, nextCursor]);

  const derivedItems = useMemo(() => {
    return items.map((item) => {
      const key = String(item.id);
      const engagement = engagementById[key];
      if (!engagement) {
        return item;
      }
      return {
        ...item,
        post: {
          ...item.post,
          liked: engagement.liked,
          like_count: engagement.likeCount,
          comment_count: engagement.commentCount,
        },
      };
    });
  }, [engagementById, items]);

  const updateEngagement = useCallback(
    (
      postId: string | number,
      delta: Partial<{ liked: boolean; likeCount: number; commentCount: number }>,
    ) => {
      const key = String(postId);
      setEngagementById((prev) => {
        const current =
          prev[key] ??
          (() => {
            const base = items.find((item) => String(item.id) === key)?.post;
            return base
              ? {
                  liked: base.liked,
                  likeCount: base.like_count,
                  commentCount: base.comment_count,
                }
              : { liked: false, likeCount: 0, commentCount: 0 };
          })();
        return {
          ...prev,
          [key]: { ...current, ...delta },
        };
      });
    },
    [items],
  );

  const handleLike = useCallback(
    async (postId: string | number) => {
      const key = String(postId);
      if (pendingLikes.current.has(key)) {
        return;
      }
      const current =
        engagementById[key] ??
        (() => {
          const base = items.find((item) => String(item.id) === key)?.post;
          return base
            ? {
                liked: base.liked,
                likeCount: base.like_count,
                commentCount: base.comment_count,
              }
            : { liked: false, likeCount: 0, commentCount: 0 };
        })();
      const nextLiked = !current.liked;
      const nextLikeCount = current.likeCount + (nextLiked ? 1 : -1);
      updateEngagement(postId, {
        liked: nextLiked,
        likeCount: Math.max(0, nextLikeCount),
      });
      pendingLikes.current.add(key);
      try {
        if (nextLiked) {
          await likePost(key);
        } else {
          await unlikePost(key);
        }
      } catch (err) {
        updateEngagement(postId, { liked: current.liked, likeCount: current.likeCount });
        console.warn('SoulReelsScreen: unable to update like', err);
      } finally {
        pendingLikes.current.delete(key);
      }
    },
    [engagementById, items, likePost, unlikePost, updateEngagement],
  );

  const handleComment = useCallback((post: Post) => {
    setCommentPost(post);
  }, []);

  const handleShare = useCallback(async (post: VideoFeedItem['post']) => {
    try {
      const message = post.text
        ? `${post.text}\n\nself.link/post/${post.id ?? ''}`.trim()
        : `Check this reel on SelfLink: self.link/post/${post.id ?? ''}`;
      await Share.share({ message });
    } catch (err) {
      console.warn('SoulReelsScreen: share failed', err);
    }
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: VideoFeedItem; index: number }) => (
      <SoulReelItem
        post={item.post}
        isActive={isFocused && String(item.id) === String(activeId)}
        isScreenFocused={isFocused}
        muted={muted}
        onMuteChange={setMuted}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onProfile={(userId) => navigation?.navigate?.('UserProfile', { userId })}
        index={index}
      />
    ),
    [activeId, handleComment, handleLike, handleShare, isFocused, muted, navigation],
  );

  const handleCloseComments = useCallback(() => {
    setCommentPost(null);
  }, []);

  const handleCommentCountChange = useCallback(
    (count: number) => {
      if (!commentPost) {
        return;
      }
      updateEngagement(commentPost.id, { commentCount: count });
    },
    [commentPost, updateEngagement],
  );

  const keyExtractor = useCallback((item: VideoFeedItem) => String(item.id), []);

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.reels.textPrimary} />
        </View>
      );
    }
    return (
      <View style={styles.loader}>
        <Text style={styles.emptyText}>No reels yet</Text>
      </View>
    );
  };

  const errorOffsetStyle = useMemo(
    () => ({
      bottom: Math.max(insets.bottom, 16) + 12,
      left: 16,
      right: 16,
    }),
    [insets.bottom],
  );

  return (
    <LinearGradient
      colors={[theme.reels.backgroundStart, theme.reels.backgroundEnd]}
      style={styles.container}
    >
      <View style={styles.halo} pointerEvents="none" />
      <FlatList
        data={derivedItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        disableIntervalMomentum
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.6}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => fetchFirstPage(currentMode).catch(() => undefined)}
            tintColor={theme.reels.textPrimary}
            colors={[theme.reels.textPrimary]}
            progressBackgroundColor="rgba(34,211,238,0.08)"
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          isPaging ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={theme.reels.textPrimary} />
            </View>
          ) : null
        }
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        style={styles.list}
      />
      {error ? (
        <View style={[styles.errorBanner, errorOffsetStyle]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => fetchFirstPage(currentMode).catch(() => undefined)}
          >
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {commentPost ? (
        <CommentsBottomSheet
          targetType="reel"
          targetId={String(commentPost.id)}
          initialCommentCount={
            engagementById[String(commentPost.id)]?.commentCount ??
            commentPost.comment_count
          }
          onClose={handleCloseComments}
          onCommentCountChange={handleCommentCountChange}
        />
      ) : null}

      <View
        style={[styles.topOverlay, { paddingTop: insets.top + 6 }]}
        pointerEvents="box-none"
      >
        <Text style={styles.screenTitle}>Reels</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              currentMode === 'for_you' && styles.modeButtonActive,
            ]}
            onPress={() => setMode('for_you')}
            hitSlop={10}
            testID="reels-tab-for-you"
          >
            <Text
              style={[
                styles.modeLabel,
                currentMode === 'for_you' && styles.modeLabelActive,
              ]}
            >
              For You
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              currentMode === 'following' && styles.modeButtonActive,
            ]}
            onPress={() => setMode('following')}
            hitSlop={10}
            testID="reels-tab-following"
          >
            <Text
              style={[
                styles.modeLabel,
                currentMode === 'following' && styles.modeLabelActive,
              ]}
            >
              Following
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.reels.backgroundEnd,
  },
  list: {
    flex: 1,
  },
  halo: {
    position: 'absolute',
    width: 320,
    height: 320,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 160,
    top: -40,
    right: -20,
    opacity: 0.45,
    transform: [{ rotate: '8deg' }],
  },
  loader: {
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.reels.textPrimary,
    fontWeight: '700',
  },
  footerLoader: {
    paddingVertical: 16,
  },
  errorBanner: {
    position: 'absolute',
    backgroundColor: 'rgba(239,68,68,0.9)',
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 6,
  },
  retry: {
    color: '#0B1120',
    fontWeight: '700',
  },
  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  screenTitle: {
    color: theme.reels.textPrimary,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: theme.reels.overlayGlass,
    borderRadius: 999,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(34,211,238,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.5)',
  },
  modeLabel: {
    color: theme.reels.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modeLabelActive: {
    color: theme.reels.textPrimary,
  },
});
