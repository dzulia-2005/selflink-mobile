import { create } from 'zustand';

import * as socialApi from '@api/social';
import type { AddCommentPayload } from '@api/social';
import type { FeedItem } from '@schemas/feed';
import type { Comment } from '@schemas/social';

interface FeedState {
  items: FeedItem[];
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
  items: [],
  isLoading: false,
  isPaging: false,
  error: undefined,
  nextUrl: null,
  async loadFeed() {
    set({ isLoading: true, error: undefined });
    try {
      const response = await socialApi.getFeed();
      set({ items: response.items, nextUrl: response.nextUrl });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load feed.' });
    } finally {
      set({ isLoading: false });
    }
  },
  async loadMore() {
    const { nextUrl, items, isPaging } = get();
    if (!nextUrl || isPaging) {
      return;
    }
    set({ isPaging: true, error: undefined });
    try {
      const response = await socialApi.getFeed(nextUrl);
      const existingKeys = new Set(items.map((item) => `${item.type}:${item.id}`));
      const incoming = response.items.filter((item) => {
        const key = `${item.type}:${item.id}`;
        if (existingKeys.has(key)) {
          return false;
        }
        existingKeys.add(key);
        return true;
      });
      set({
        items: items.concat(incoming),
        nextUrl: response.nextUrl,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unable to load more feed items.',
      });
    } finally {
      set({ isPaging: false });
    }
  },
  async likePost(postId) {
    const previousItems = get().items;
    set({
      items: previousItems.map((item) =>
        item.type === 'post' && String(item.post.id) === String(postId)
          ? { ...item, post: { ...item.post, liked: true, like_count: item.post.like_count + 1 } }
          : item,
      ),
    });
    try {
      await socialApi.likePost(postId);
    } catch (error) {
      set({ items: previousItems, error: 'Unable to like post.' });
      throw error;
    }
  },
  async unlikePost(postId) {
    const previousItems = get().items;
    set({
      items: previousItems.map((item) =>
        item.type === 'post' && String(item.post.id) === String(postId)
          ? {
              ...item,
              post: {
                ...item.post,
                liked: false,
                like_count: Math.max(0, item.post.like_count - 1),
              },
            }
          : item,
      ),
    });
    try {
      await socialApi.unlikePost(postId);
    } catch (error) {
      set({ items: previousItems, error: 'Unable to unlike post.' });
      throw error;
    }
  },
  async addComment(postId, payload) {
    const trimmed = payload.body?.trim() ?? '';
    const hasAttachments =
      Boolean(payload.image) ||
      (Array.isArray(payload.images) && payload.images.length > 0);
    const normalizedPayload: AddCommentPayload = {
      ...payload,
      body: trimmed,
    };
    if (!trimmed && !hasAttachments) {
      throw new Error('Write a comment or attach a photo.');
    }
    try {
      const comment = await socialApi.addComment(postId, normalizedPayload);
      set({
        items: get().items.map((item) =>
          item.type === 'post' && String(item.post.id) === String(postId)
            ? { ...item, post: { ...item.post, comment_count: item.post.comment_count + 1 } }
            : item,
        ),
      });
      return comment;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to add comment.' });
      throw error;
    }
  },
}));
