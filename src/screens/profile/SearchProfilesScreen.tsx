import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { followUser, searchUsers, unfollowUser, UserSummary } from '@api/users';
import { UserAvatar } from '@components/UserAvatar';
import { useAuthStore } from '@store/authStore';

export function SearchProfilesScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const currentUserId = useAuthStore((state) => state.currentUser?.id);

  const handleSearch = useCallback(async () => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(undefined);
    try {
      const data = await searchUsers(normalizedQuery);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to search users.');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={styles.formRow}>
        <TextInput
          placeholder="Search profiles"
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          autoCapitalize="none"
        />
        <Button title="Search" onPress={handleSearch} disabled={isLoading} />
      </View>
      {isLoading && <ActivityIndicator style={styles.loading} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.resultRow}>
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
            >
              <UserAvatar uri={item.photo} label={item.name || item.handle} size={40} />
              <View style={styles.resultMeta}>
                <Text style={styles.resultName}>{item.name || item.handle || item.username}</Text>
                <Text style={styles.resultHandle}>@{item.handle || item.username}</Text>
                <Text style={styles.resultCounts}>
                  Followers: {item.followers_count ?? 0} • Following: {item.following_count ?? 0}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.followButton,
                item.id === currentUserId && styles.followButtonDisabled,
              ]}
              onPress={async () => {
                if (item.id === currentUserId) {
                  return;
                }
                const next = !item.is_following;
                setResults((prev) =>
                  prev.map((user) =>
                    user.id === item.id ? { ...user, is_following: next } : user,
                  ),
                );
                try {
                  if (next) {
                    await followUser(item.id);
                  } else {
                    await unfollowUser(item.id);
                  }
                } catch (err) {
                  console.warn('SearchProfiles: follow toggle failed', err);
                  setResults((prev) =>
                    prev.map((user) =>
                      user.id === item.id ? { ...user, is_following: !next } : user,
                    ),
                  );
                }
              }}
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
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !isLoading && results.length === 0 ? (
            <View style={styles.empty}> 
              <Text>No results</Text>
            </View>
          ) : null
        }
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loading: {
    marginBottom: 12,
  },
  error: {
    color: '#DC2626',
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
    fontWeight: '600',
  },
  resultHandle: {
    color: '#475569',
  },
  resultCounts: {
    color: '#475569',
    fontSize: 12,
  },
  followButton: {
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followButtonText: {
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
});
