import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as socialApi from '@api/social';
import type { User } from '@schemas/user';
import { useAuthStore } from '@store/authStore';
import { useFeedStore } from '@store/feedStore';

import type { CommentWithOptimistic } from './types';

type UseCommentsControllerParams = {
  targetId: string;
  initialCommentCount?: number;
  onCommentCountChange?: (count: number) => void;
};

type UseCommentsControllerResult = {
  comments: CommentWithOptimistic[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  input: string;
  setInput: (value: string) => void;
  submitComment: () => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  canSubmit: boolean;
  submitting: boolean;
};

const buildFallbackAuthor = (): User => {
  const now = new Date().toISOString();
  return {
    id: 0,
    email: '',
    handle: 'you',
    name: 'You',
    bio: '',
    photo: '',
    birth_date: null,
    birth_time: null,
    birth_place: '',
    locale: 'en',
    flags: {},
    created_at: now,
    updated_at: now,
  };
};

const buildOptimisticComment = (
  targetId: string,
  body: string,
  author: User,
): CommentWithOptimistic => ({
  id: `temp-${Date.now()}`,
  post: targetId,
  author,
  body,
  text: body,
  parent: null,
  created_at: new Date().toISOString(),
  __optimistic: true,
});

export function useCommentsController({
  targetId,
  initialCommentCount,
  onCommentCountChange,
}: UseCommentsControllerParams): UseCommentsControllerResult {
  const currentUser = useAuthStore((state) => state.currentUser);
  const addCommentToStore = useFeedStore((state) => state.addComment);
  const [comments, setComments] = useState<CommentWithOptimistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const countRef = useRef(initialCommentCount ?? 0);
  const commentsRef = useRef<CommentWithOptimistic[]>([]);

  useEffect(() => {
    countRef.current = initialCommentCount ?? 0;
  }, [initialCommentCount, targetId]);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  const applyCommentCount = useCallback(
    (nextCount: number) => {
      countRef.current = nextCount;
      onCommentCountChange?.(nextCount);
    },
    [onCommentCountChange],
  );

  const fetchPage = useCallback(
    async (pageNumber: number, replace: boolean) => {
      try {
        const data = await socialApi.getPostComments(targetId, pageNumber);
        if (replace) {
          setComments(data);
          setHasMore(data.length > 0);
        } else {
          const existing = new Set(commentsRef.current.map((item) => String(item.id)));
          const deduped = data.filter((item) => !existing.has(String(item.id)));
          setComments((prev) => prev.concat(deduped));
          setHasMore(deduped.length > 0);
        }
        setPage(pageNumber);
      } catch (fetchError) {
        console.warn('CommentsBottomSheet: failed to load comments', fetchError);
        setError('Unable to load comments.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [targetId],
  );

  useEffect(() => {
    setComments([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    setError(null);
    fetchPage(1, true).catch(() => undefined);
  }, [fetchPage, targetId]);

  const refresh = useCallback(async () => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    setError(null);
    await fetchPage(1, true);
  }, [fetchPage, refreshing]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || refreshing || !hasMore) {
      return;
    }
    const nextPage = page + 1;
    setLoadingMore(true);
    await fetchPage(nextPage, false);
  }, [fetchPage, hasMore, loading, loadingMore, page, refreshing]);

  const submitComment = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setInput('');

    const author = currentUser ?? buildFallbackAuthor();
    const optimistic = buildOptimisticComment(targetId, trimmed, author);
    setComments((prev) => prev.concat(optimistic));

    try {
      const created = await addCommentToStore(String(targetId), {
        body: trimmed,
      });
      setComments((prev) => {
        const withoutTemp = prev.filter(
          (item) => String(item.id) !== String(optimistic.id),
        );
        return withoutTemp.concat(created);
      });
      applyCommentCount(countRef.current + 1);
    } catch (submitError) {
      console.warn('CommentsBottomSheet: failed to add comment', submitError);
      setComments((prev) =>
        prev.filter((item) => String(item.id) !== String(optimistic.id)),
      );
      setInput(trimmed);
      setError(
        submitError instanceof Error ? submitError.message : 'Unable to add comment.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [addCommentToStore, applyCommentCount, currentUser, input, submitting, targetId]);

  const canSubmit = useMemo(() => Boolean(input.trim()), [input]);

  return {
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
  };
}
