import {
  ActivityIndicator,
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
  View,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { likeComment, normalizeLikesApiError, unlikeComment } from '@api/likes';
import { GiftPickerSheet } from '@components/gifts/GiftPickerSheet';
import { useToast } from '@context/ToastContext';
import { useAuthStore } from '@store/authStore';
import { theme } from '@theme';
import { normalizeGiftRenderData } from '@utils/gifts';

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
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const closingRef = useRef(false);
  const [commentReactions, setCommentReactions] = useState<
    Record<string, { liked: boolean; likeCount: number; giftCount: number }>
  >({});
  const [giftSyncByComment, setGiftSyncByComment] = useState<Record<string, boolean>>(
    {},
  );
  const [giftTargetId, setGiftTargetId] = useState<string | null>(null);
  const commentLikeCooldownRef = useRef<Record<string, number>>({});
  const commentLikePendingRef = useRef<Record<string, boolean>>({});

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
        };
        changed = true;
      });
      return changed ? next : prev;
    });
  }, [comments]);

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
    (_gift, quantity: number, status?: 'pending' | 'synced' | 'failed') => {
      if (!giftTargetId) {
        return;
      }
      if (status === 'pending') {
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
    [giftTargetId],
  );

  const renderItem = useCallback(
    ({ item }: { item: CommentWithOptimistic }) => {
      const key = String(item.id);
      const reaction = commentReactions[key];
      return (
        <CommentItem
          comment={item}
          liked={reaction?.liked}
          likeCount={reaction?.likeCount ?? 0}
          giftCount={reaction?.giftCount ?? 0}
          giftSyncing={giftSyncByComment[key] ?? false}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
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
