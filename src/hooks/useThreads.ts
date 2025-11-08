import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@context/ToastContext';
import { createThread, listThreads, Thread } from '@services/api/threads';

type Options = {
  pageSize?: number;
};

export function useThreads(options: Options = {}) {
  const toast = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchThreads = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const response = await listThreads({
          page_size: options.pageSize ?? 20,
          cursor: reset ? undefined : cursor ?? undefined,
          ordering: '-updated_at',
        });
        setThreads((prev) => (reset ? response.results : [...prev, ...response.results]));
        setCursor(response.next);
        setHasMore(Boolean(response.next));
      } catch (error) {
        console.warn('useThreads: failed to load', error);
        toast.push({ tone: 'error', message: 'Unable to load inbox. Please try again.' });
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [cursor, options.pageSize, toast],
  );

  useEffect(() => {
    fetchThreads(true);
  }, [fetchThreads]);

  const startThread = useCallback(
    async (payload: Parameters<typeof createThread>[0]) => {
      try {
        const thread = await createThread(payload);
        setThreads((prev) => [thread, ...prev]);
        toast.push({ tone: 'info', message: 'Thread created.' });
        return thread;
      } catch (error) {
        console.warn('useThreads: failed to create thread', error);
        toast.push({ tone: 'error', message: 'Unable to create thread.' });
        throw error;
      }
    },
    [toast],
  );

  return {
    threads,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh: () => fetchThreads(true),
    loadMore: () => {
      if (!hasMore || loadingMore) return;
      fetchThreads(false);
    },
    createThread: startThread,
  };
}
