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

import { getForYouVideoFeed } from '@api/videoFeed';
import { SoulReelItem } from '@components/SoulReelItem';
import { CommentContent } from '@components/comments/CommentContent';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import type { Comment, Post } from '@schemas/social';
import type { VideoFeedItem } from '@schemas/videoFeed';
import { useFeedStore } from '@store/feedStore';
import * as socialApi from '@api/social';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SoulReelsScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const toast = useToast();
  const likePost = useFeedStore((state) => state.likePost);
  const unlikePost = useFeedStore((state) => state.unlikePost);
  const addCommentToStore = useFeedStore((state) => state.addComment);
  const pendingLikes = useRef<Set<string>>(new Set());
  const [items, setItems] = useState<VideoFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaging, setIsPaging] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
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

  const loadFirstPage = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const response = await getForYouVideoFeed();
      setItems(response.items);
      setNextCursor(response.next);
      setEngagementById((prev) => {
        const nextState = { ...prev };
        response.items.forEach((item) => {
          const key = String(item.id);
          nextState[key] = {
            liked: item.post.liked,
            likeCount: item.post.like_count,
            commentCount: item.post.comment_count,
          };
        });
        return nextState;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load videos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNextPage = useCallback(async () => {
    if (!nextCursor || isPaging) {
      return;
    }
    setIsPaging(true);
    setError(undefined);
    try {
      const response = await getForYouVideoFeed(nextCursor);
      setItems((prev) => prev.concat(response.items));
      setEngagementById((prev) => {
        const nextState = { ...prev };
        response.items.forEach((item) => {
          const key = String(item.id);
          nextState[key] = {
            liked: item.post.liked,
            likeCount: item.post.like_count,
            commentCount: item.post.comment_count,
          };
        });
        return nextState;
      });
      setNextCursor(response.next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load more videos.');
    } finally {
      setIsPaging(false);
    }
  }, [isPaging, nextCursor]);

  useEffect(() => {
    loadFirstPage().catch(() => undefined);
  }, [loadFirstPage]);

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
    (postId: string | number, delta: Partial<{ liked: boolean; likeCount: number; commentCount: number }>) => {
      const key = String(postId);
      setEngagementById((prev) => {
        const current =
          prev[key] ??
          (() => {
            const base = items.find((item) => String(item.id) === key)?.post;
            return base
              ? { liked: base.liked, likeCount: base.like_count, commentCount: base.comment_count }
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
            ? { liked: base.liked, likeCount: base.like_count, commentCount: base.comment_count }
            : { liked: false, likeCount: 0, commentCount: 0 };
        })();
      const nextLiked = !current.liked;
      const nextLikeCount = current.likeCount + (nextLiked ? 1 : -1);
      updateEngagement(postId, { liked: nextLiked, likeCount: Math.max(0, nextLikeCount) });
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
        commentCount: (engagementById[String(commentingPost.id)]?.commentCount ?? commentingPost.comment_count) + 1,
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
  }, [addCommentToStore, commentPending, commentText, commentingPost, engagementById, toast, updateEngagement]);
  const renderItem = useCallback(
    ({ item }: { item: VideoFeedItem }) => (
      <SoulReelItem
        post={item.post}
        isActive={isFocused && String(item.id) === String(activeId)}
        muted={muted}
        onToggleMute={() => setMuted((prev) => !prev)}
        onLike={handleLike}
        onComment={(postId) => {
          const matched = derivedItems.find((entry) => String(entry.id) === String(postId));
          if (matched) {
            openComments(matched.post);
          }
        }}
        onProfile={(userId) => navigation.navigate('UserProfile', { userId })}
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Reels</Text>
        <View style={styles.rightPlaceholder} />
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
            onRefresh={() => loadFirstPage().catch(() => undefined)}
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
          <TouchableOpacity onPress={() => loadFirstPage().catch(() => undefined)}>
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
                    <UserAvatar uri={item.author.photo} label={item.author.name} size={34} />
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
