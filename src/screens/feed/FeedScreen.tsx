import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewToken,
  View,
} from 'react-native';

import { FeedPostCard } from '@components/FeedPostCard';
import { MatrixFeedCard } from '@components/MatrixFeedCard';
import { MentorFeedCard } from '@components/MentorFeedCard';
import { InsightSkeleton } from '@components/skeleton/InsightSkeleton';
import { PostSkeleton } from '@components/skeleton/PostSkeleton';
import { SoulMatchSkeleton } from '@components/skeleton/SoulMatchSkeleton';
import { SoulMatchFeedCard } from '@components/SoulMatchFeedCard';
import type { FeedItem, FeedMode } from '@schemas/feed';
import { useFeedStore } from '@store/feedStore';
import { theme } from '@theme';

export function FeedScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const currentMode = useFeedStore((state) => state.currentMode);
  const items = useFeedStore((state) => state.itemsByMode[state.currentMode]);
  const isLoading = useFeedStore((state) => state.isLoadingByMode[state.currentMode]);
  const isPaging = useFeedStore((state) => state.isPagingByMode[state.currentMode]);
  const error = useFeedStore((state) => state.errorByMode[state.currentMode]);
  const loadFeed = useFeedStore((state) => state.loadFeed);
  const dirtyByMode = useFeedStore((state) => state.dirtyByMode);
  const clearDirty = useFeedStore((state) => state.clearDirty);
  const loadMore = useFeedStore((state) => state.loadMore);
  const setMode = useFeedStore((state) => state.setMode);
  const listRef = useRef<FlatList<FeedItem>>(null);
  const scrollOffsets = useRef<Record<FeedMode, number>>({ for_you: 0, following: 0 });
  const indicator = useRef(new Animated.Value(currentMode === 'for_you' ? 0 : 1)).current;
  const [segmentWidth, setSegmentWidth] = useState(0);
  const showFab = useMemo(() => items.some((item) => item.type === 'post'), [items]);
  const [activeVideoPostId, setActiveVideoPostId] = useState<string | null>(null);
  const videoExtraData = useMemo(
    () => ({ activeVideoPostId, isFocused }),
    [activeVideoPostId, isFocused],
  );

  useEffect(() => {
    loadFeed().catch(() => undefined);
  }, [loadFeed]);

  useFocusEffect(
    useCallback(() => {
      const mode = currentMode;
      if (!dirtyByMode[mode]) {
        return;
      }
      clearDirty(mode);
      loadFeed(mode).catch(() => undefined);
    }, [clearDirty, currentMode, dirtyByMode, loadFeed]),
  );

  useEffect(() => {
    Animated.timing(indicator, {
      toValue: currentMode === 'for_you' ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    const offset = scrollOffsets.current[currentMode] ?? 0;
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset, animated: false });
    });
  }, [currentMode, indicator]);

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

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      switch (item.type) {
        case 'post':
          return (
            <FeedPostCard
              post={item.post}
              isVideoActive={
                isFocused &&
                Boolean(item.post.video?.url) &&
                String(item.post.id) === String(activeVideoPostId ?? '')
              }
            />
          );
        case 'mentor_insight':
          return <MentorFeedCard data={item.mentor} />;
        case 'matrix_insight':
          return <MatrixFeedCard data={item.matrix} />;
        case 'soulmatch_reco':
          return <SoulMatchFeedCard data={item.soulmatch} />;
        default:
          return null;
      }
    },
    [activeVideoPostId, isFocused],
  );

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

  const showInitialSkeleton = isLoading && items.length === 0;

  const renderSkeletons = useCallback(() => {
    return (
      <View style={styles.skeletonList}>
        {Array.from({ length: 4 }).map((_, index) => (
          <PostSkeleton key={`post-skel-${index}`} hasMedia={index % 2 === 0} />
        ))}
        <InsightSkeleton />
        <SoulMatchSkeleton />
      </View>
    );
  }, []);

  const renderFooter = useCallback(() => {
    if (!isPaging) {
      return null;
    }
    return (
      <View style={styles.footerSkeletons}>
        <PostSkeleton hasMedia={false} />
      </View>
    );
  }, [isPaging]);

  const errorContent =
    error && items.length === 0 ? (
      <View style={styles.errorState}>
        <LinearGradient
          colors={theme.gradients.nebulaPurple}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.errorCard}
        >
          <Text style={styles.errorTitle}>We lost the signal</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadFeed()}>
            <Text style={styles.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    ) : null;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<ViewToken<FeedItem>> }) => {
      if (!isFocused) {
        return;
      }
      const visibleVideos = viewableItems
        .filter(
          (token) =>
            token.isViewable &&
            token.item?.type === 'post' &&
            Boolean((token.item as any)?.post?.video?.url),
        )
        .map((token) => {
          if (token.item?.type !== 'post') {
            return { id: null, index: token.index ?? 0 };
          }
          const postId = token.item.post.id;
          return {
            id: postId ? String(postId) : null,
            index: token.index ?? 0,
          };
        })
        .filter((item) => item.id !== null);

      if (!visibleVideos.length) {
        setActiveVideoPostId(null);
        return;
      }
      const next = visibleVideos.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];
      setActiveVideoPostId((prev) => (prev === next.id ? prev : (next.id as string)));
    },
    [isFocused],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 75,
  });

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.container}>
      <View
        style={styles.modeSwitch}
        onLayout={(event) => setSegmentWidth(event.nativeEvent.layout.width / 2)}
      >
        <View style={styles.modeTrack} pointerEvents="none">
          <Animated.View
            style={[
              styles.modeIndicator,
              {
                width: segmentWidth || '50%',
                transform: [
                  {
                    translateX: indicator.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, segmentWidth || 0],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
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
        <TouchableOpacity
          style={styles.reelsButton}
          onPress={() => navigation.navigate('SoulReels')}
          activeOpacity={0.85}
        >
          <Text style={styles.reelsLabel}>SoulReels</Text>
        </TouchableOpacity>
      </View>
      {showInitialSkeleton ? (
        renderSkeletons()
      ) : errorContent ? (
        errorContent
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={renderSeparator}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && items.length > 0}
              onRefresh={loadFeed}
              tintColor="#9B4EFF"
              colors={['#9B4EFF', '#0EA5E9']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onScroll={(event) => {
            scrollOffsets.current[currentMode] = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          extraData={videoExtraData}
        />
      )}
      {showFab ? (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 6,
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
    alignItems: 'center',
  },
  modeTrack: {
    position: 'absolute',
    left: 16,
    right: 116,
    top: 10,
    bottom: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  modeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(124,58,237,0.18)',
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
  reelsButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
  },
  reelsLabel: {
    color: '#0B1120',
    fontWeight: '700',
  },
  skeletonList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  footerSkeletons: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorState: {
    padding: 16,
  },
  errorCard: {
    borderRadius: 20,
    padding: 18,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorSubtitle: {
    color: '#E2E8F0',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  retryLabel: {
    color: '#0B1120',
    fontWeight: '700',
  },
});
