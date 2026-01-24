import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { followUser, searchUsers, unfollowUser, UserSummary } from '@api/users';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import { useAuthStore } from '@store/authStore';
import { theme } from '@theme';

export function SearchProfilesScreen() {
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const searchRequestId = useRef(0);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setResults([]);
      setError(undefined);
      setIsLoading(false);
      return;
    }
    const requestId = ++searchRequestId.current;
    const timeout = setTimeout(() => {
      setIsLoading(true);
      setError(undefined);
      searchUsers(normalizedQuery)
        .then((data) => {
          if (searchRequestId.current !== requestId) {
            return;
          }
          setResults(data);
        })
        .catch((err) => {
          if (searchRequestId.current !== requestId) {
            return;
          }
          setError(err instanceof Error ? err.message : 'Unable to search users.');
        })
        .finally(() => {
          if (searchRequestId.current === requestId) {
            setIsLoading(false);
          }
        });
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleCopyRecipientId = useCallback(
    async (accountKey: string) => {
      try {
        await Clipboard.setStringAsync(accountKey);
        toast.push({ message: 'Copied to clipboard', tone: 'info', duration: 1500 });
      } catch (error) {
        console.warn('SearchProfiles: copy recipient id failed', error);
        toast.push({ message: 'Unable to copy right now.', tone: 'error' });
      }
    },
    [toast],
  );

  const handleFollowToggle = useCallback(
    async (candidate: UserSummary) => {
      if (candidate.id === currentUserId) {
        return;
      }
      const nextState = !candidate.is_following;
      setResults((prev) =>
        prev.map((user) =>
          user.id === candidate.id ? { ...user, is_following: nextState } : user,
        ),
      );
      try {
        if (nextState) {
          await followUser(candidate.id);
        } else {
          await unfollowUser(candidate.id);
        }
      } catch (err) {
        console.warn('SearchProfiles: follow toggle failed', err);
        setResults((prev) =>
          prev.map((user) =>
            user.id === candidate.id ? { ...user, is_following: !nextState } : user,
          ),
        );
      }
    },
    [currentUserId],
  );

  const renderResult = useCallback(
    ({ item }: { item: UserSummary }) => (
      <View style={styles.resultRow}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
        >
          <UserAvatar uri={item.photo} label={item.name || item.handle} size={40} />
          <View style={styles.resultMeta}>
            <Text style={styles.resultName}>
              {item.name || item.handle || item.username}
            </Text>
            <Text style={styles.resultHandle}>@{item.handle || item.username}</Text>
            <Text style={styles.resultCounts}>
              Followers {item.followers_count ?? 0} • Following{' '}
              {item.following_count ?? 0}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.resultActions}>
          {item.account_key ? (
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => handleCopyRecipientId(item.account_key as string)}
            >
              <Text style={styles.copyButtonText}>Copy ID</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[
              styles.followButton,
              item.id === currentUserId && styles.followButtonDisabled,
            ]}
            onPress={() => handleFollowToggle(item)}
          >
            <Text style={styles.followButtonText}>
              {item.id === currentUserId
                ? 'You'
                : item.is_following
                  ? 'Following'
                  : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [currentUserId, handleCopyRecipientId, handleFollowToggle, navigation],
  );

  const keyExtractor = useCallback((item: UserSummary) => String(item.id), []);
  const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

  const emptyComponent = useMemo(() => {
    if (isLoading || results.length > 0) {
      return null;
    }
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          {query.trim() ? 'No results.' : 'Search for a user to send SLC.'}
        </Text>
      </View>
    );
  }, [isLoading, query, results.length]);

  return (
    <View style={styles.container}>
      <View style={styles.formRow}>
        <TextInput
          placeholder="Search users"
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          autoCapitalize="none"
        />
      </View>
      {isLoading && <ActivityIndicator style={styles.loading} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={results}
        keyExtractor={keyExtractor}
        renderItem={renderResult}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={emptyComponent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  formRow: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.feed.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: theme.feed.textPrimary,
    backgroundColor: theme.feed.glass,
  },
  loading: {
    marginBottom: 12,
  },
  error: {
    color: theme.palette.ember,
    marginBottom: 12,
  },
  resultRow: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  resultMeta: { flex: 1 },
  resultName: {
    fontWeight: '700',
    color: theme.feed.textPrimary,
  },
  resultHandle: {
    color: theme.feed.textSecondary,
  },
  resultCounts: {
    color: theme.feed.textMuted,
    fontSize: 12,
  },
  resultActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  followButton: {
    borderWidth: 1,
    borderColor: theme.feed.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.feed.glass,
  },
  copyButton: {
    borderWidth: 1,
    borderColor: theme.feed.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.feed.cardBackground,
  },
  copyButtonText: {
    fontWeight: '700',
    color: theme.feed.textPrimary,
    fontSize: 12,
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followButtonText: {
    fontWeight: '700',
    color: theme.feed.textPrimary,
  },
  separator: {
    height: 1,
    backgroundColor: theme.feed.cardBorder,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.feed.textSecondary,
  },
});
