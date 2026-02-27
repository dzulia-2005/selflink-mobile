import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as socialApi from '@api/social';
import { CommentContent } from '@components/comments/CommentContent';
import { PostContent } from '@components/PostContent';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import { useMultiImagePicker } from '@hooks/useMultiImagePicker';
import type { Comment, Post } from '@schemas/social';
import { useFeedStore } from '@store/feedStore';

interface RouteParams {
  postId: string;
  post?: Post;
}

type DetailsRoute = RouteProp<Record<'PostDetails', RouteParams>, 'PostDetails'>;

const collectCommentImageSources = (comment: Comment): string[] => {
  const sources: string[] = [];
  const push = (value?: string | null) => {
    if (typeof value === 'string' && value.length > 0) {
      sources.push(value);
    }
  };
  push(comment.image_url);
  if (Array.isArray(comment.image_urls)) {
    comment.image_urls.forEach(push);
  }
  if (Array.isArray(comment.images)) {
    comment.images.forEach(push);
  }
  return sources;
};

export function PostDetailsScreen() {
  const { t } = useTranslation();
  const route = useRoute<DetailsRoute>();
  const [post, setPost] = useState<Post | undefined>(route.params?.post);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingPost, setLoadingPost] = useState(!route.params?.post);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const addCommentToStore = useFeedStore((state) => state.addComment);
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const {
    images: selectedImages,
    pickImages,
    removeImage,
    clearImages,
    isPicking,
    canAddMore,
  } = useMultiImagePicker();
  const postId = route.params?.postId ?? post?.id;
  const canSubmit = useMemo(
    () => commentText.trim().length > 0 || selectedImages.length > 0,
    [commentText, selectedImages],
  );

  const fetchPost = useCallback(async () => {
    if (!postId || route.params?.post) {
      return;
    }
    setLoadingPost(true);
    try {
      const data = await socialApi.getPost(postId);
      setPost(data);
    } catch (error) {
      console.warn('PostDetails: failed to load post', error);
    } finally {
      setLoadingPost(false);
    }
  }, [postId, route.params?.post]);

  const fetchComments = useCallback(async () => {
    if (!postId) {
      return;
    }
    setLoadingComments(true);
    try {
      const data = await socialApi.getPostComments(postId);
      setComments(data);
    } catch (error) {
      console.warn('PostDetails: failed to load comments', error);
    } finally {
      setLoadingComments(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost().catch(() => undefined);
  }, [fetchPost]);

  useEffect(() => {
    fetchComments().catch(() => undefined);
  }, [fetchComments]);

  const handleSubmit = useCallback(async () => {
    if (!postId || !canSubmit) {
      return;
    }
    setSubmitting(true);
    try {
      const trimmed = commentText.trim();
      const newComment = await addCommentToStore(postId, {
        body: trimmed,
        images: selectedImages,
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      clearImages();
    } catch (error) {
      console.warn('PostDetails: failed to add comment', error);
      const message =
        typeof error === 'object' && error && 'response' in error
          ? ((error as any).response?.data?.detail as string | undefined)
          : error instanceof Error
            ? error.message
            : undefined;
      toast.push({
        message: message || t('post.comments.alerts.sendFailed.body'),
        tone: 'error',
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    postId,
    canSubmit,
    commentText,
    addCommentToStore,
    selectedImages,
    toast,
    clearImages,
    t,
  ]);

  if (!postId) {
    return (
      <View style={styles.centered}>
        <Text>{t('post.title.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loadingPost ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator accessibilityLabel={t('post.comments.loading')} />
          <Text style={styles.loadingText}>{t('post.comments.loading')}</Text>
        </View>
      ) : (
        <View style={styles.postBlock}>
          <View style={styles.postHeader}>
            <UserAvatar uri={post?.author.photo} label={post?.author.name} size={48} />
            <View style={styles.postMeta}>
              <Text style={styles.postAuthor}>{post?.author.name}</Text>
              <Text style={styles.postHandle}>
                {post ? `@${post.author.handle}` : ''}
              </Text>
              <Text style={styles.postTimestamp}>
                {post ? new Date(post.created_at).toLocaleString() : ''}
              </Text>
            </View>
          </View>
          <View style={styles.postBody}>
            <PostContent
              text={post?.text}
              media={post?.media}
              video={post?.video}
              shouldAutoplay={false}
              isScreenFocused={false}
              legacySources={[
                post?.images,
                post?.image_urls,
                post?.image_url,
                (post as any)?.image,
                (post as any)?.photo,
                (post as any)?.photos,
              ]}
            />
          </View>
        </View>
      )}

      {loadingComments ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator accessibilityLabel={t('post.comments.loading')} />
          <Text style={styles.loadingText}>{t('post.comments.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <UserAvatar uri={item.author.photo} label={item.author.name} size={36} />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{item.author.name}</Text>
                  <Text style={styles.commentTimestamp}>
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
                <CommentContent
                  text={item.body}
                  media={item.media}
                  legacySources={collectCommentImageSources(item)}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyComments}>
              {t('post.comments.empty.title')}
            </Text>
          }
        />
      )}

      <View style={[styles.composerBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {selectedImages.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewScroll}
          >
            {selectedImages.map((image) => (
              <View key={image.uri} style={styles.previewContainer}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.previewRemoveButton}
                  onPress={() => removeImage(image.uri)}
                  accessibilityRole="button"
                  accessibilityLabel={t('post.accessibility.removeSelectedImage')}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.composer}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              (isPicking || submitting || !canAddMore) && styles.iconButtonDisabled,
            ]}
            onPress={pickImages}
            disabled={isPicking || submitting || !canAddMore}
            accessibilityRole="button"
            accessibilityLabel={t('post.accessibility.attachImages')}
          >
            <Ionicons name="image-outline" size={20} color="#CBD5F5" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t('post.comments.composer.placeholder')}
            placeholderTextColor="#94A3B8"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            textAlignVertical="top"
            editable={!submitting}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!canSubmit || submitting) && styles.sendButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            accessibilityRole="button"
            accessibilityLabel={t('post.accessibility.sendComment')}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#0B1120" size="small" />
            ) : (
              <Text style={styles.sendLabel}>{t('post.comments.composer.send')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBlock: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    backgroundColor: '#0B1120',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  postHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  postMeta: {
    flex: 1,
  },
  postAuthor: {
    fontWeight: '600',
    color: '#F8FAFC',
    fontSize: 18,
  },
  postHandle: {
    color: '#94A3B8',
    fontSize: 13,
  },
  postTimestamp: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  postBody: {
    marginTop: 14,
  },
  comment: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    marginBottom: 12,
  },
  commentContent: {
    flex: 1,
    gap: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: {
    fontWeight: '500',
    color: '#F8FAFC',
    fontSize: 15,
  },
  commentTimestamp: {
    color: '#94A3B8',
    fontSize: 11,
  },
  emptyComments: {
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  composerBar: {
    marginTop: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0B1120',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#1F2937',
    gap: 12,
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 120,
    color: '#F8FAFC',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11182b',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    minWidth: 72,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendLabel: {
    color: '#0B1120',
    fontWeight: '600',
  },
  previewScroll: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 4,
  },
  previewContainer: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  previewRemoveButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
