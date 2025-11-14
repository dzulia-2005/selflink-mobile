import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import ThreadListItem from '@components/messaging/ThreadListItem';
import type { Thread } from '@schemas/messaging';
import { useAuthStore } from '@store/authStore';
import {
  selectIsLoadingThreads,
  selectMessagingError,
  selectThreads,
  useMessagingStore,
} from '@store/messagingStore';
import { theme } from '@theme';

export function ThreadsScreen() {
  const navigation = useNavigation<any>();
  const threads = useMessagingStore(selectThreads);
  const isLoading = useMessagingStore(selectIsLoadingThreads);
  const error = useMessagingStore(selectMessagingError);
  const loadThreads = useMessagingStore((state) => state.loadThreads);
  const removeThread = useMessagingStore((state) => state.removeThread);
  const sessionUserId = useMessagingStore((state) => state.sessionUserId);
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);

  useEffect(() => {
    loadThreads().catch(() => undefined);
  }, [loadThreads]);

  const handleRefresh = useCallback(() => {
    loadThreads().catch(() => undefined);
  }, [loadThreads]);

  const handleThreadPress = useCallback(
    (thread: Thread) => {
      const otherUser =
        currentUserId != null
          ? thread.participants?.find((participant) => participant.id !== currentUserId)
          : thread.participants?.[0];
      navigation.navigate('Chat', {
        threadId: String(thread.id),
        otherUserId: otherUser?.id,
      });
    },
    [currentUserId, navigation],
  );

  const confirmDeleteThread = useCallback(
    (thread: Thread) => {
      if (pendingThreadId) {
        return;
      }
      Alert.alert(
        'Delete conversation?',
        'This removes the conversation from your inbox.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete conversation',
            style: 'destructive',
            onPress: () => {
              const key = String(thread.id);
              setPendingThreadId(key);
              removeThread(thread.id)
                .catch((err) => {
                  console.warn('ThreadsScreen: delete thread failed', err);
                  Alert.alert('Unable to delete conversation', 'Please try again.');
                })
                .finally(() => {
                  setPendingThreadId((current) => (current === key ? null : current));
                });
            },
          },
        ],
      );
    },
    [pendingThreadId, removeThread],
  );

  const renderThread = useCallback(
    ({ item }: { item: Thread }) => (
      <ThreadListItem
        thread={item}
        currentUserId={sessionUserId ?? currentUserId ?? null}
        onPress={handleThreadPress}
        onLongPress={(thread) => confirmDeleteThread(thread)}
      />
    ),
    [confirmDeleteThread, currentUserId, handleThreadPress, sessionUserId],
  );

  const keyExtractor = useCallback((item: Thread) => String(item.id), []);
  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  if (isLoading && threads.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && threads.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={threads}
      keyExtractor={keyExtractor}
      renderItem={renderThread}
      ItemSeparatorComponent={renderSeparator}
      contentContainerStyle={
        threads.length === 0 ? styles.emptyContent : styles.listContent
      }
      refreshing={isLoading && threads.length > 0}
      onRefresh={handleRefresh}
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No conversations yet.</Text>
            <Text style={styles.emptySubtitle}>
              Start a chat from someone’s profile to see it here.
            </Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.palette.graphite,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    color: theme.palette.silver,
  },
});
