import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useToast } from '@context/ToastContext';
import {
  UsersListResponse,
  UsersQuery,
  followUser,
  listUsers,
  unfollowUser,
  UserProfile,
} from '@services/api/user';

type Options = {
  initialSearch?: string;
  pageSize?: number;
};

type DirectoryUser = UserProfile & {
  flags: Record<string, unknown> & { following?: boolean };
};

function normalizeUser(user: UserProfile): DirectoryUser {
  const flags = (user.flags ?? {}) as DirectoryUser['flags'];
  return { ...user, flags };
}

export function useUsersDirectory(options: Options = {}) {
  const toast = useToast();
  const [search, setSearch] = useState(options.initialSearch ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pendingFollows, setPendingFollows] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const pageParams: UsersQuery = useMemo(
    () => ({
      cursor: undefined,
      page_size: options.pageSize,
      search: debouncedSearch.trim() || undefined,
    }),
    [debouncedSearch, options.pageSize],
  );

  const applyPage = useCallback(
    (response: UsersListResponse, reset: boolean) => {
      const normalized = response.results.map(normalizeUser);
      setUsers((prev) => (reset ? normalized : [...prev, ...normalized]));
      setCursor(response.next);
      setHasMore(Boolean(response.next));
    },
    [],
  );

  const handleError = useCallback(
    (error: unknown, message: string) => {
      console.warn(message, error);
      toast.push({
        message,
        tone: 'error',
      });
    },
    [toast],
  );

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  const fetchPage = useCallback(
    async (reset = false) => {
      const cursorValue = reset ? null : cursorRef.current;
      if (reset) {
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const response = await listUsers({
          ...pageParams,
          cursor: cursorValue ?? undefined,
        });
        applyPage(response, reset);
      } catch (error) {
        handleError(error, 'Unable to load community members.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [applyPage, handleError, pageParams],
  );

  useEffect(() => {
    fetchPage(true);
  }, [fetchPage, debouncedSearch]);

  const refresh = useCallback(() => fetchPage(true), [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) {
      return;
    }
    fetchPage(false);
  }, [fetchPage, hasMore, loadingMore]);

  const toggleFollow = useCallback(
    async (userId: number) => {
      const target = users.find((user) => user.id === userId);
      if (!target) {
        return;
      }
      const currentlyFollowing = Boolean(target.flags?.following);
      setPendingFollows((prev) => ({ ...prev, [userId]: true }));
      try {
        if (currentlyFollowing) {
          await unfollowUser(userId);
        } else {
          await followUser(userId);
        }
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  flags: { ...user.flags, following: !currentlyFollowing },
                }
              : user,
          ),
        );
      } catch (error) {
        handleError(error, 'Action failed. Please try again.');
      } finally {
        setPendingFollows((prev) => ({ ...prev, [userId]: false }));
      }
    },
    [handleError, users],
  );

  return {
    users,
    search,
    setSearch,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
    toggleFollow,
    pendingFollows,
  };
}
