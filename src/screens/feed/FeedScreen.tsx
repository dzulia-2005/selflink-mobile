import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FeedPostCard } from '@components/FeedPostCard';
import { MatrixFeedCard } from '@components/MatrixFeedCard';
import { MentorFeedCard } from '@components/MentorFeedCard';
import type { FeedItem } from '@schemas/feed';
import { useFeedStore } from '@store/feedStore';

export function FeedScreen() {
  const navigation = useNavigation<any>();
  const items = useFeedStore((state) => state.items);
  const isLoading = useFeedStore((state) => state.isLoading);
  const error = useFeedStore((state) => state.error);
  const loadFeed = useFeedStore((state) => state.loadFeed);
  const loadMore = useFeedStore((state) => state.loadMore);
  const showFab = useMemo(
    () => items.some((item) => item.type === 'post'),
    [items],
  );

  useEffect(() => {
    loadFeed().catch(() => undefined);
  }, [loadFeed]);

  const headerAction = useCallback(() => {
    return (
      <TouchableOpacity onPress={() => navigation.navigate('SearchProfiles')}>
        <Text style={styles.headerAction}>Search</Text>
      </TouchableOpacity>
    );
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: headerAction,
    });
  }, [headerAction, navigation]);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    switch (item.type) {
      case 'post':
        return <FeedPostCard post={item.post} />;
      case 'mentor_insight':
        return <MentorFeedCard data={item.mentor} />;
      case 'matrix_insight':
        return <MatrixFeedCard data={item.matrix} />;
      default:
        return null;
    }
  }, []);

  const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return null;
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No posts yet</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.primaryButtonLabel}>Create your first post</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading, navigation]);

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={renderSeparator}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && items.length > 0}
            onRefresh={loadFeed}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={renderEmpty}
      />
      {showFab ? (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  separator: {
    height: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  primaryButtonLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    marginTop: -2,
  },
  headerAction: {
    marginRight: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
});
