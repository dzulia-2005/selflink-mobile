import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as socialApi from '@api/social';
import { MarkdownText } from '@components/markdown/MarkdownText';
import { useToast } from '@context/ToastContext';
import { useImagePicker, type PickedImage } from '@hooks/useImagePicker';
import type { Comment, Post } from '@schemas/social';
import { useFeedStore } from '@store/feedStore';

interface RouteParams {
  postId: string;
  post?: Post;
}

type DetailsRoute = RouteProp<Record<'PostDetails', RouteParams>, 'PostDetails'>;

export function PostDetailsScreen() {
  const route = useRoute<DetailsRoute>();
  const [post, setPost] = useState<Post | undefined>(route.params?.post);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingPost, setLoadingPost] = useState(!route.params?.post);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedImage, setSelectedImage] = useState<PickedImage | null>(null);
  const addCommentToStore = useFeedStore((state) => state.addComment);
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { pickImage, isPicking } = useImagePicker({ allowsEditing: false, quality: 0.9 });
  const postId = route.params?.postId ?? post?.id;
  const canSubmit = useMemo(
    () => commentText.trim().length > 0 || Boolean(selectedImage),
    [commentText, selectedImage],
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
        image: selectedImage
          ? {
              uri: selectedImage.uri,
              name: selectedImage.name ?? 'comment-photo.jpg',
              type: selectedImage.type ?? 'image/jpeg',
            }
          : undefined,
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      setSelectedImage(null);
    } catch (error) {
      console.warn('PostDetails: failed to add comment', error);
      const message =
        typeof error === 'object' && error && 'response' in error
          ? ((error as any).response?.data?.detail as string | undefined)
          : error instanceof Error
            ? error.message
            : undefined;
      toast.push({
        message: message || 'Unable to add comment. Please try again.',
        tone: 'error',
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [postId, canSubmit, commentText, addCommentToStore, selectedImage, toast]);

  const handlePickImage = useCallback(async () => {
    if (isPicking || submitting) {
      return;
    }
    const asset = await pickImage();
    if (asset) {
      setSelectedImage(asset);
    }
  }, [isPicking, pickImage, submitting]);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  if (!postId) {
    return (
      <View style={styles.centered}>
        <Text>Post not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loadingPost ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.postBlock}>
          <Text style={styles.postAuthor}>{post?.author.name}</Text>
          <Text style={styles.postContent}>{post?.text}</Text>
        </View>
      )}

      {loadingComments ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <Text style={styles.commentAuthor}>{item.author.name}</Text>
              {item.body ? <MarkdownText>{item.body}</MarkdownText> : null}
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.commentImage}
                  resizeMode="cover"
                />
              ) : null}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyComments}>No comments yet.</Text>}
        />
      )}

      <View style={[styles.composerBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {selectedImage ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.previewRemoveButton}
              onPress={handleRemoveImage}
              accessibilityRole="button"
              accessibilityLabel="Remove selected image"
            >
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.composer}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              (isPicking || submitting) && styles.iconButtonDisabled,
            ]}
            onPress={handlePickImage}
            disabled={isPicking || submitting}
            accessibilityRole="button"
            accessibilityLabel="Attach an image"
          >
            <Ionicons name="image-outline" size={20} color="#CBD5F5" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Write a comment (Markdown supported)"
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
            accessibilityLabel="Send comment"
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#0B1120" size="small" />
            ) : (
              <Text style={styles.sendLabel}>Send</Text>
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
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5F5',
    marginBottom: 16,
  },
  postAuthor: {
    fontWeight: '600',
  },
  postContent: {
    marginTop: 8,
  },
  comment: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  commentAuthor: {
    fontWeight: '500',
    color: '#E2E8F0',
  },
  commentImage: {
    width: '100%',
    borderRadius: 12,
    minHeight: 160,
    maxHeight: 240,
    marginTop: 4,
  },
  emptyComments: {
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 16,
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
  previewContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: 4,
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
