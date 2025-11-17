import { create } from 'zustand';

import * as socialApi from '@api/social';
import type { AddCommentPayload } from '@api/social';
import type { Comment, Post } from '@schemas/social';

interface FeedState {
  posts: Post[];
  isLoading: boolean;
  isPaging: boolean;
  error?: string;
  nextUrl: string | null;
  loadFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  addComment: (postId: string, payload: AddCommentPayload) => Promise<Comment>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  isLoading: false,
  isPaging: false,
  error: undefined,
  nextUrl: null,
  async loadFeed() {
    set({ isLoading: true, error: undefined });
    try {
      const response = await socialApi.getFeed();
      const posts = response.results.map((entry) => entry.post);
      set({ posts, nextUrl: response.nextUrl });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load feed.' });
    } finally {
      set({ isLoading: false });
    }
  },
  async loadMore() {
    const { nextUrl, posts, isPaging } = get();
    if (!nextUrl || isPaging) {
      return;
    }
    set({ isPaging: true, error: undefined });
    try {
      const response = await socialApi.getFeed(nextUrl);
      if (!response.results.length) {
        set({ nextUrl: response.nextUrl });
        return;
      }
      const incoming = response.results
        .map((entry) => entry.post)
        .filter(
          (post) => !posts.some((existing) => String(existing.id) === String(post.id)),
        );
      if (!incoming.length) {
        set({ nextUrl: response.nextUrl });
        return;
      }
      set({
        posts: posts.concat(incoming),
        nextUrl: response.nextUrl,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unable to load more posts.',
      });
    } finally {
      set({ isPaging: false });
    }
  },
  async likePost(postId) {
    const previousPosts = get().posts;
    set({
      posts: previousPosts.map((post) =>
        String(post.id) === String(postId)
          ? { ...post, liked: true, like_count: post.like_count + 1 }
          : post,
      ),
    });
    try {
      await socialApi.likePost(postId);
    } catch (error) {
      set({ posts: previousPosts, error: 'Unable to like post.' });
      throw error;
    }
  },
  async unlikePost(postId) {
    const previousPosts = get().posts;
    set({
      posts: previousPosts.map((post) =>
        String(post.id) === String(postId)
          ? { ...post, liked: false, like_count: Math.max(0, post.like_count - 1) }
          : post,
      ),
    });
    try {
      await socialApi.unlikePost(postId);
    } catch (error) {
      set({ posts: previousPosts, error: 'Unable to unlike post.' });
      throw error;
    }
  },
  async addComment(postId, payload) {
    const trimmed = payload.body?.trim() ?? '';
    const normalizedPayload: AddCommentPayload = {
      ...payload,
      body: trimmed,
    };
    if (!trimmed && !payload.image) {
      throw new Error('Write a comment or attach a photo.');
    }
    try {
      const comment = await socialApi.addComment(postId, normalizedPayload);
      set({
        posts: get().posts.map((post) =>
          String(post.id) === String(postId)
            ? { ...post, comment_count: post.comment_count + 1 }
            : post,
        ),
      });
      return comment;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to add comment.' });
      throw error;
    }
  },
}));
