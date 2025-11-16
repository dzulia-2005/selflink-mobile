import { RouteProp, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as socialApi from '@api/social';
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
  const addCommentToStore = useFeedStore((state) => state.addComment);
  const insets = useSafeAreaInsets();
  const postId = route.params?.postId ?? post?.id;

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
    if (!postId || !commentText.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      const trimmed = commentText.trim();
      const newComment = await addCommentToStore(postId, trimmed);
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch (error) {
      console.warn('PostDetails: failed to add comment', error);
      const message =
        typeof error === 'object' && error && 'response' in error
          ? ((error as any).response?.data?.detail as string | undefined)
          : undefined;
      Alert.alert('Unable to add comment', message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [postId, commentText, addCommentToStore]);

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
              <Text>{item.text}</Text>
            </View>
          )}
          ListEmptyComponent={<Text>No comments yet.</Text>}
        />
      )}

      <View style={[styles.composerBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Write a comment"
            value={commentText}
            onChangeText={setCommentText}
          />
          <Button
            title={submitting ? 'Sending…' : 'Send'}
            onPress={handleSubmit}
            disabled={submitting}
          />
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
  },
  commentAuthor: {
    fontWeight: '500',
  },
  composerBar: {
    marginTop: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0B1120',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#1F2937',
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
});
