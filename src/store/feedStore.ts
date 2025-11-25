import { create } from 'zustand';

import * as socialApi from '@api/social';
import type { AddCommentPayload } from '@api/social';
import type { FeedItem, FeedMode } from '@schemas/feed';
import type { Comment } from '@schemas/social';

interface FeedState {
  currentMode: FeedMode;
  itemsByMode: Record<FeedMode, FeedItem[]>;
  nextByMode: Record<FeedMode, string | null>;
  isLoadingByMode: Record<FeedMode, boolean>;
  isPagingByMode: Record<FeedMode, boolean>;
  errorByMode: Record<FeedMode, string | undefined>;
  loadFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  setMode: (mode: FeedMode) => void;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  addComment: (postId: string, payload: AddCommentPayload) => Promise<Comment>;
}

const MODES: FeedMode[] = ['for_you', 'following'];

const emptyByMode = <T,>(value: T): Record<FeedMode, T> => ({
  for_you: value,
  following: value,
});

const updateItemsAcrossModes = (
  itemsByMode: Record<FeedMode, FeedItem[]>,
  updater: (item: FeedItem) => FeedItem,
): Record<FeedMode, FeedItem[]> =>
  MODES.reduce((acc, mode) => {
    acc[mode] = itemsByMode[mode].map(updater);
    return acc;
  }, {} as Record<FeedMode, FeedItem[]>);

export const useFeedStore = create<FeedState>((set, get) => ({
  currentMode: 'for_you',
  itemsByMode: emptyByMode<FeedItem[]>([]),
  nextByMode: emptyByMode<string | null>(null),
  isLoadingByMode: emptyByMode<boolean>(false),
  isPagingByMode: emptyByMode<boolean>(false),
  errorByMode: emptyByMode<string | undefined>(undefined),
  async loadFeed() {
    const mode = get().currentMode;
    set((state) => ({
      isLoadingByMode: { ...state.isLoadingByMode, [mode]: true },
      errorByMode: { ...state.errorByMode, [mode]: undefined },
    }));
    try {
      const fetcher =
        mode === 'following' ? socialApi.getFollowingFeed : socialApi.getForYouFeed;
      const response = await fetcher();
      set((state) => ({
        itemsByMode: { ...state.itemsByMode, [mode]: response.items },
        nextByMode: { ...state.nextByMode, [mode]: response.nextUrl },
      }));
    } catch (error) {
      set((state) => ({
        errorByMode: {
          ...state.errorByMode,
          [mode]: error instanceof Error ? error.message : 'Unable to load feed.',
        },
      }));
    } finally {
      set((state) => ({
        isLoadingByMode: { ...state.isLoadingByMode, [mode]: false },
      }));
    }
  },
  async loadMore() {
    const mode = get().currentMode;
    const { nextByMode, itemsByMode, isPagingByMode } = get();
    const nextUrl = nextByMode[mode];
    if (!nextUrl || isPagingByMode[mode]) {
      return;
    }
    set((state) => ({
      isPagingByMode: { ...state.isPagingByMode, [mode]: true },
      errorByMode: { ...state.errorByMode, [mode]: undefined },
    }));
    try {
      const fetcher =
        mode === 'following' ? socialApi.getFollowingFeed : socialApi.getForYouFeed;
      const response = await fetcher(nextUrl);
      const existingKeys = new Set(itemsByMode[mode].map((item) => `${item.type}:${item.id}`));
      const incoming = response.items.filter((item) => {
        const key = `${item.type}:${item.id}`;
        if (existingKeys.has(key)) {
          return false;
        }
        existingKeys.add(key);
        return true;
      });
      set({
        itemsByMode: {
          ...itemsByMode,
          [mode]: itemsByMode[mode].concat(incoming),
        },
        nextByMode: { ...nextByMode, [mode]: response.nextUrl },
      });
    } catch (error) {
      set((state) => ({
        errorByMode: {
          ...state.errorByMode,
          [mode]:
            error instanceof Error ? error.message : 'Unable to load more feed items.',
        },
      }));
    } finally {
      set((state) => ({
        isPagingByMode: { ...state.isPagingByMode, [mode]: false },
      }));
    }
  },
  setMode(mode) {
    set((state) => ({
      currentMode: mode,
    }));
    const state = get();
    if (!state.itemsByMode[mode].length && !state.isLoadingByMode[mode]) {
      // Fire and forget; caller can await loadFeed if needed.
      state.loadFeed().catch(() => undefined);
    }
  },
  async likePost(postId) {
    const previousItems = get().itemsByMode;
    const updated = updateItemsAcrossModes(previousItems, (item) =>
      item.type === 'post' && String(item.post.id) === String(postId)
        ? { ...item, post: { ...item.post, liked: true, like_count: item.post.like_count + 1 } }
        : item,
    );
    set({ itemsByMode: updated });
    try {
      await socialApi.likePost(postId);
    } catch (error) {
      set((state) => ({
        itemsByMode: previousItems,
        errorByMode: { ...state.errorByMode, [state.currentMode]: 'Unable to like post.' },
      }));
      throw error;
    }
  },
  async unlikePost(postId) {
    const previousItems = get().itemsByMode;
    const updated = updateItemsAcrossModes(previousItems, (item) =>
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
    );
    set({ itemsByMode: updated });
    try {
      await socialApi.unlikePost(postId);
    } catch (error) {
      set((state) => ({
        itemsByMode: previousItems,
        errorByMode: {
          ...state.errorByMode,
          [state.currentMode]: 'Unable to unlike post.',
        },
      }));
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
      set((state) => ({
        itemsByMode: updateItemsAcrossModes(state.itemsByMode, (item) =>
          item.type === 'post' && String(item.post.id) === String(postId)
            ? { ...item, post: { ...item.post, comment_count: item.post.comment_count + 1 } }
            : item,
        ),
      }));
      return comment;
    } catch (error) {
      set((state) => ({
        errorByMode: {
          ...state.errorByMode,
          [state.currentMode]:
            error instanceof Error ? error.message : 'Unable to add comment.',
        },
      }));
      throw error;
    }
  },
}));
