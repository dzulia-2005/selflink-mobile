import { create } from 'zustand';

import * as socialApi from '@api/social';
import type { Comment, Post } from '@schemas/social';

interface FeedState {
  posts: Post[];
  isLoading: boolean;
  error?: string;
  cursor: string | null;
  loadFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  likePost: (postId: number) => Promise<void>;
  unlikePost: (postId: number) => Promise<void>;
  addComment: (postId: number, text: string) => Promise<Comment>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  isLoading: false,
  error: undefined,
  cursor: null,
  async loadFeed() {
    set({ isLoading: true, error: undefined });
    try {
      const response = await socialApi.getFeed();
      const posts = response.results.map((entry) => entry.post);
      set({ posts, cursor: response.nextCursor ?? null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load feed.' });
    } finally {
      set({ isLoading: false });
    }
  },
  async loadMore() {
    const { cursor, posts } = get();
    if (!cursor) {
      return;
    }
    try {
      // TODO: Backend pagination currently relies on cursor filtering; once a proper
      //       paginated endpoint is available we should switch to it.
      const response = await socialApi.getFeed({ cursor });
      if (!response.results.length) {
        set({ cursor: null });
        return;
      }
      const newPosts = response.results
        .map((entry) => entry.post)
        .filter((incoming) => !posts.some((existing) => existing.id === incoming.id));
      set({
        posts: posts.concat(newPosts),
        cursor: response.nextCursor ?? null,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load more posts.' });
    }
  },
  async likePost(postId) {
    const previousPosts = get().posts;
    set({
      posts: previousPosts.map((post) =>
        post.id === postId
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
        post.id === postId
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
  async addComment(postId, text) {
    try {
      const comment = await socialApi.addComment(postId, text);
      set({
        posts: get().posts.map((post) =>
          post.id === postId
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
