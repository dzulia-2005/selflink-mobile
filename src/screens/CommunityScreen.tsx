import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalPanel } from '@components/MetalPanel';
import { UserCard } from '@components/UserCard';
import { useUsersDirectory } from '@hooks/useUsersDirectory';
import type { UserProfile } from '@services/api/user';
import { useTheme, type Theme } from '@theme';

export function CommunityScreen() {
  const { theme, resolved } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
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
  } = useUsersDirectory({ pageSize: 12 });

  const renderItem = useCallback(
    ({ item }: { item: UserProfile }) => (
      <UserCard
        user={item}
        onToggleFollow={toggleFollow}
        pending={Boolean(pendingFollows[String(item.id)])}
      />
    ),
    [pendingFollows, toggleFollow],
  );

  const keyExtractor = useCallback(
    (item: { id: string | number }) => String(item.id),
    [],
  );

  const ListEmpty = useCallback(() => {
    if (loading) {
      return null;
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No signals yet</Text>
        <Text style={styles.emptyCopy}>
          Try a different search. As Jobs reminded us, focus sharpens discovery.
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <Text style={styles.title}>Community</Text>
              <Text style={styles.subtitle}>
                Crafted with a Jobs-level obsession for polish, engineered with Linus's
                clarity, and ambitious enough for Musk's Mars boardroom.
              </Text>
            </View>
            <MetalPanel glow>
              <Text style={styles.panelTitle}>Signal Search</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by handle, name, or intention"
                placeholderTextColor={theme.palette.graphite}
                style={styles.input}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </MetalPanel>
          </>
        }
        contentContainerStyle={styles.listContent}
        data={users}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReachedThreshold={0.2}
        onEndReached={() => {
          if (hasMore && !loadingMore) {
            loadMore();
          }
        }}
        refreshing={refreshing}
        onRefresh={refresh}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loader}>
              <ActivityIndicator color={theme.palette.platinum} />
            </View>
          ) : null
        }
        ListEmptyComponent={ListEmpty}
      />
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={theme.palette.platinum} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
  },
  hero: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.palette.platinum,
    ...theme.typography.title,
  },
  subtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  panelTitle: {
    color: theme.palette.titanium,
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.palette.obsidian,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.palette.platinum,
    borderWidth: 1,
    borderColor: theme.palette.graphite,
    ...theme.typography.body,
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  loader: {
    paddingVertical: theme.spacing.md,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
  emptyCopy: {
    color: theme.palette.silver,
    textAlign: 'center',
    ...theme.typography.body,
    maxWidth: 280,
  },
});
