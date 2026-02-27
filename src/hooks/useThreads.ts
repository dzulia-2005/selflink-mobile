import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@context/ToastContext';
import { createThread, listThreads, Thread } from '@services/api/threads';

type Options = {
  pageSize?: number;
};

export function useThreads(options: Options = {}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const pageSize = options.pageSize ?? 20;

  const loadPage = useCallback(
    async (replace: boolean, cursorValue: string | null) => {
      if (replace) {
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const response = await listThreads({
          page_size: pageSize,
          cursor: cursorValue ?? undefined,
          ordering: '-updated_at',
        });
        setThreads((prev) =>
          replace ? response.results : [...prev, ...response.results],
        );
        setCursor(response.next);
        setHasMore(Boolean(response.next));
      } catch (error) {
        console.warn('useThreads: failed to load', error);
        toast.push({ tone: 'error', message: t('inbox.alerts.loadFailed') });
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [pageSize, t, toast],
  );

  useEffect(() => {
    loadPage(true, null);
  }, [loadPage]);

  const startThread = useCallback(
    async (payload: Parameters<typeof createThread>[0]) => {
      try {
        const thread = await createThread(payload);
        setThreads((prev) => [thread, ...prev]);
        toast.push({ tone: 'info', message: t('inbox.alerts.threadCreated') });
        return thread;
      } catch (error) {
        console.warn('useThreads: failed to create thread', error);
        toast.push({ tone: 'error', message: t('inbox.alerts.createFailed') });
        throw error;
      }
    },
    [t, toast],
  );

  const refresh = useCallback(() => loadPage(true, null), [loadPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) {
      return;
    }
    await loadPage(false, cursor);
  }, [cursor, hasMore, loadPage, loadingMore]);

  return {
    threads,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
    createThread: startThread,
  };
}
