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
import { SoulMatchFeedCard } from '@components/SoulMatchFeedCard';
import type { FeedItem, FeedMode } from '@schemas/feed';
import { useFeedStore } from '@store/feedStore';

export function FeedScreen() {
  const navigation = useNavigation<any>();
  const currentMode = useFeedStore((state) => state.currentMode);
  const items = useFeedStore((state) => state.itemsByMode[state.currentMode]);
  const isLoading = useFeedStore((state) => state.isLoadingByMode[state.currentMode]);
  const error = useFeedStore((state) => state.errorByMode[state.currentMode]);
  const loadFeed = useFeedStore((state) => state.loadFeed);
  const loadMore = useFeedStore((state) => state.loadMore);
  const setMode = useFeedStore((state) => state.setMode);
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

  const handleModeChange = useCallback(
    (mode: FeedMode) => {
      if (mode === currentMode) {
        return;
      }
      setMode(mode);
    },
    [currentMode, setMode],
  );

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    switch (item.type) {
      case 'post':
        return <FeedPostCard post={item.post} />;
      case 'mentor_insight':
        return <MentorFeedCard data={item.mentor} />;
      case 'matrix_insight':
        return <MatrixFeedCard data={item.matrix} />;
      case 'soulmatch_reco':
        return <SoulMatchFeedCard data={item.soulmatch} />;
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
      <View style={styles.modeSwitch}>
        {(['for_you', 'following'] as FeedMode[]).map((mode) => {
          const active = mode === currentMode;
          return (
            <TouchableOpacity
              key={mode}
              style={[styles.modeButton, active && styles.modeButtonActive]}
              onPress={() => handleModeChange(mode)}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                {mode === 'for_you' ? 'For You' : 'Following'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    paddingTop: 8,
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
  modeSwitch: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  modeButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  modeLabel: {
    color: '#1F2937',
    fontWeight: '700',
  },
  modeLabelActive: {
    color: '#fff',
  },
});
