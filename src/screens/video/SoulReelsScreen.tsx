import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
  Dimensions,
} from 'react-native';

import { getForYouVideoFeed } from '@api/videoFeed';
import { SoulReelItem } from '@components/SoulReelItem';
import type { VideoFeedItem } from '@schemas/videoFeed';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SoulReelsScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [items, setItems] = useState<VideoFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaging, setIsPaging] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  });

  const loadFirstPage = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const response = await getForYouVideoFeed();
      setItems(response.items);
      setNextCursor(response.next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load videos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNextPage = useCallback(async () => {
    if (!nextCursor || isPaging) {
      return;
    }
    setIsPaging(true);
    setError(undefined);
    try {
      const response = await getForYouVideoFeed(nextCursor);
      setItems((prev) => prev.concat(response.items));
      setNextCursor(response.next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load more videos.');
    } finally {
      setIsPaging(false);
    }
  }, [isPaging, nextCursor]);

  useEffect(() => {
    loadFirstPage().catch(() => undefined);
  }, [loadFirstPage]);

  useEffect(() => {
    if (!isFocused) {
      setActiveId(null);
    }
  }, [isFocused]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken<VideoFeedItem>> }) => {
      if (!isFocused) {
        return;
      }
      const visible = viewableItems.find((item) => item.isViewable);
      if (visible?.item?.id !== undefined) {
        setActiveId(String(visible.item.id));
      }
    },
  ).current;

  const renderItem = useCallback(
    ({ item }: { item: VideoFeedItem }) => (
      <SoulReelItem
        post={item.post}
        isActive={isFocused && String(item.id) === String(activeId)}
      />
    ),
    [activeId, isFocused],
  );

  const keyExtractor = useCallback((item: VideoFeedItem) => String(item.id), []);

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.loader}>
          <ActivityIndicator color="#fff" />
        </View>
      );
    }
    return (
      <View style={styles.loader}>
        <Text style={styles.emptyText}>No videos yet</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Reels</Text>
        <View style={styles.rightPlaceholder} />
      </View>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        disableIntervalMomentum
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.6}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadFirstPage().catch(() => undefined)}
            tintColor="#fff"
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          isPaging ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null
        }
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
      />
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadFirstPage().catch(() => undefined)}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingTop: 36,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  screenTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  loader: {
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
  footerLoader: {
    paddingVertical: 16,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(239,68,68,0.9)',
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 6,
  },
  retry: {
    color: '#0B1120',
    fontWeight: '700',
  },
  rightPlaceholder: {
    width: 48,
  },
});
