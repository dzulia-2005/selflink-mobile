import { useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@context/ToastContext';
import {
  Message,
  MessageQuery,
  createMessage,
  listMessages,
} from '@services/api/messages';

type Options = {
  threadId?: number;
  pageSize?: number;
  ordering?: string;
};

type MessageComposerState = {
  body: string;
  sending: boolean;
};

const initialComposer: MessageComposerState = {
  body: '',
  sending: false,
};

export function useMessages(options: Options = {}) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [composer, setComposer] = useState<MessageComposerState>(initialComposer);

  const query: MessageQuery = useMemo(
    () => ({
      cursor: undefined,
      ordering: options.ordering,
      page_size: options.pageSize ?? 25,
      search: options.threadId ? `thread:${options.threadId}` : undefined,
    }),
    [options.ordering, options.pageSize, options.threadId],
  );

  const handleError = useCallback(
    (error: unknown, message: string) => {
      console.warn('useMessages:', message, error);
      toast.push({ tone: 'error', message });
    },
    [toast],
  );

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const response = await listMessages({
          ...query,
          cursor: reset ? undefined : cursor ?? undefined,
        });
        setMessages((prev) => (reset ? response.results : [...prev, ...response.results]));
        setCursor(response.next);
        setHasMore(Boolean(response.next));
      } catch (error) {
        handleError(error, 'Unable to load messages.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [cursor, handleError, query],
  );

  useEffect(() => {
    fetchPage(true);
  }, [fetchPage]);

  const refresh = useCallback(() => fetchPage(true), [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) {
      return;
    }
    fetchPage(false);
  }, [fetchPage, hasMore, loadingMore]);

  const updateComposer = useCallback(
    (body: string) => setComposer((prev) => ({ ...prev, body })),
    [],
  );

  const sendMessage = useCallback(async () => {
    if (!composer.body.trim()) {
      return;
    }
    try {
      setComposer((prev) => ({ ...prev, sending: true }));
      const message = await createMessage({
        thread: options.threadId ?? 0,
        body: composer.body.trim(),
      });
      setMessages((prev) => [message, ...prev]);
      setComposer(initialComposer);
    } catch (error) {
      handleError(error, 'Unable to send message.');
      setComposer((prev) => ({ ...prev, sending: false }));
    }
  }, [composer.body, handleError, options.threadId]);

  return {
    messages,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
    composer,
    updateComposer,
    sendMessage,
  };
}
