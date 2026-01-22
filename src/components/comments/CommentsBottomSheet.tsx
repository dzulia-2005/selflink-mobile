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
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@store/authStore';
import { theme } from '@theme';

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
  const currentUser = useAuthStore((state) => state.currentUser);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const closingRef = useRef(false);

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

  const renderItem = useCallback(
    ({ item }: { item: CommentWithOptimistic }) => <CommentItem comment={item} />,
    [],
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
