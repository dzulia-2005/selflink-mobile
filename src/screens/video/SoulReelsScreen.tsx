import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
  Dimensions,
} from 'react-native';

import * as socialApi from '@api/social';
import { getForYouVideoFeed } from '@api/videoFeed';
import { CommentContent } from '@components/comments/CommentContent';
import { SoulReelItem } from '@components/SoulReelItem';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import type { Comment, Post } from '@schemas/social';
import type { VideoFeedItem } from '@schemas/videoFeed';
import { useFeedStore } from '@store/feedStore';
import { useVideoFeedStore } from '@store/videoFeedStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const useSafeNavigation = <T,>() => {
  try {
    return useNavigation<T>();
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('SoulReelsScreen: navigation unavailable', error);
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

const useSafeToast = () => {
  try {
    return useToast();
  } catch {
    return {
      push: () => undefined,
    };
  }
};

export function SoulReelsScreen() {
  const navigation = useSafeNavigation<any>();
  const isFocused = useSafeIsFocused();
  const toast = useSafeToast();
  const likePost = useFeedStore((state) => state.likePost);
  const unlikePost = useFeedStore((state) => state.unlikePost);
  const addCommentToStore = useFeedStore((state) => state.addComment);
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
  const items = itemsByMode[currentMode] ?? [];
  const nextCursor = nextByMode[currentMode];
  const isLoading = isLoadingByMode[currentMode];
  const isPaging = isPagingByMode[currentMode];
  const error = errorByMode[currentMode];
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [muted, setMuted] = useState(true);
  const [commentingPost, setCommentingPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentPending, setCommentPending] = useState(false);
  const [engagementById, setEngagementById] = useState<
    Record<string, { liked: boolean; likeCount: number; commentCount: number }>
  >({});
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
        toast.push({
          message: 'Unable to update like. Please try again.',
          tone: 'error',
          duration: 2500,
        });
      } finally {
        pendingLikes.current.delete(key);
      }
    },
    [engagementById, items, likePost, toast, unlikePost, updateEngagement],
  );

  const openComments = useCallback((post: Post) => {
    setComments([]);
    setCommentText('');
    setCommentingPost(post);
  }, []);

  useEffect(() => {
    const loadComments = async () => {
      if (!commentingPost) {
        return;
      }
      setLoadingComments(true);
      try {
        const data = await socialApi.getPostComments(commentingPost.id);
        setComments(data);
      } catch (err) {
        toast.push({
          message: 'Unable to load comments.',
          tone: 'error',
          duration: 2500,
        });
      } finally {
        setLoadingComments(false);
      }
    };
    loadComments().catch(() => undefined);
  }, [commentingPost, toast]);

  const handleSubmitComment = useCallback(async () => {
    if (!commentingPost || !commentText.trim() || commentPending) {
      return;
    }
    setCommentPending(true);
    try {
      const newComment = await addCommentToStore(String(commentingPost.id), {
        body: commentText.trim(),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      updateEngagement(commentingPost.id, {
        commentCount:
          (engagementById[String(commentingPost.id)]?.commentCount ??
            commentingPost.comment_count) + 1,
      });
    } catch (err) {
      toast.push({
        message: 'Unable to add comment. Please try again.',
        tone: 'error',
        duration: 2500,
      });
    } finally {
      setCommentPending(false);
    }
  }, [
    addCommentToStore,
    commentPending,
    commentText,
    commentingPost,
    engagementById,
    toast,
    updateEngagement,
  ]);
  const renderItem = useCallback(
    ({ item }: { item: VideoFeedItem }) => (
      <SoulReelItem
        post={item.post}
        isActive={isFocused && String(item.id) === String(activeId)}
        muted={muted}
        onToggleMute={() => setMuted((prev) => !prev)}
        onLike={handleLike}
        onComment={(postId) => {
          const matched = derivedItems.find(
            (entry) => String(entry.id) === String(postId),
          );
          if (matched) {
            openComments(matched.post);
          }
        }}
        onProfile={(userId) => navigation?.navigate?.('UserProfile', { userId })}
      />
    ),
    [activeId, derivedItems, handleLike, isFocused, muted, navigation, openComments],
  );

  const keyExtractor = useCallback((item: VideoFeedItem) => String(item.id), []);

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.loader}>
          <ActivityIndicator color="#fff" />
        </View>
      );
    }
    return (
      <View style={styles.loader}>
        <Text style={styles.emptyText}>No videos yet</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()}>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Reels</Text>
        <View style={styles.rightPlaceholder} />
      </View>
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeButton, currentMode === 'for_you' && styles.modeButtonActive]}
          onPress={() => setMode('for_you')}
        >
          <Text
            style={[styles.modeLabel, currentMode === 'for_you' && styles.modeLabelActive]}
          >
            For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, currentMode === 'following' && styles.modeButtonActive]}
          onPress={() => setMode('following')}
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
            tintColor="#fff"
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          isPaging ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null
        }
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchFirstPage(currentMode).catch(() => undefined)}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal
        visible={Boolean(commentingPost)}
        animationType="slide"
        onRequestClose={() => setCommentingPost(null)}
        transparent
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.commentSheet}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentingPost(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#E2E8F0" />
              </TouchableOpacity>
            </View>
            {loadingComments ? (
              <View style={styles.loader}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <UserAvatar
                      uri={item.author.photo}
                      label={item.author.name}
                      size={34}
                    />
                    <View style={styles.commentBody}>
                      <Text style={styles.commentAuthor}>{item.author.name}</Text>
                      <CommentContent text={item.body} media={item.media} />
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.loader}>
                    <Text style={styles.emptyText}>Be the first to comment</Text>
                  </View>
                }
              />
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a comment…"
                placeholderTextColor="#94A3B8"
                style={styles.commentInput}
                editable={!commentPending}
              />
              <TouchableOpacity
                onPress={handleSubmitComment}
                style={styles.commentSend}
                disabled={commentPending || !commentText.trim()}
              >
                {commentPending ? (
                  <ActivityIndicator color="#0B1120" />
                ) : (
                  <Text style={styles.sendLabel}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingTop: 36,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  screenTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  loader: {
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
  footerLoader: {
    paddingVertical: 16,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
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
  rightPlaceholder: {
    width: 48,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1f2937',
  },
  modeButtonActive: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  modeLabel: {
    color: '#e5e7eb',
    fontWeight: '600',
  },
  modeLabelActive: {
    color: '#bbf7d0',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  commentSheet: {
    maxHeight: '70%',
    backgroundColor: '#0B1120',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  commentTitle: {
    color: '#E2E8F0',
    fontWeight: '800',
    fontSize: 16,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  commentAuthor: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#E2E8F0',
    backgroundColor: '#0F172A',
  },
  commentSend: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendLabel: {
    color: '#0B1120',
    fontWeight: '700',
  },
});
