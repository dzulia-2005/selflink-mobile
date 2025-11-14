import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { navigateToUserProfile } from '@navigation/helpers';
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
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);

  useEffect(() => {
    loadThreads().catch(() => undefined);
  }, [loadThreads]);

  const openProfile = useCallback(
    (userId: number) => {
      navigateToUserProfile(navigation, userId);
    },
    [navigation],
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
    ({ item }: { item: Thread }) => {
      const otherUser =
        currentUserId != null
          ? item.participants?.find((participant) => participant.id !== currentUserId)
          : undefined;
      const title = otherUser?.name || otherUser?.handle || item.title || 'Conversation';
      const preview = item.last_message?.body ?? 'No messages yet.';
      const isUnread = (item.unread_count ?? 0) > 0;
      const lastUpdated = item.last_message?.created_at
        ? formatThreadTime(item.last_message.created_at)
        : '';
      return (
        <View style={styles.cardWrapper}>
          <Pressable
            style={styles.threadCard}
            onPress={() =>
              navigation.navigate('Chat', {
                threadId: item.id,
                otherUserId: otherUser?.id,
              })
            }
          >
            <View style={styles.cardMainRow}>
              <View style={[styles.avatar, isUnread && styles.avatarUnread]}>
                <Text style={[styles.avatarLabel, isUnread && styles.avatarLabelUnread]}>
                  {getInitials(title)}
                </Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text
                    style={[styles.threadTitle, isUnread && styles.threadTitleUnread]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  <Text style={styles.threadTime}>{lastUpdated}</Text>
                </View>
                <Text
                  style={[styles.threadPreview, isUnread && styles.threadPreviewUnread]}
                  numberOfLines={1}
                >
                  {preview}
                </Text>
              </View>
              {isUnread ? (
                <View style={styles.unreadPill}>
                  <Text style={styles.unreadText}>
                    {Math.min(item.unread_count ?? 0, 99)}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
          <View style={styles.cardFooter}>
            {otherUser ? (
              <TouchableOpacity
                style={styles.profileLink}
                onPress={() => openProfile(otherUser.id)}
              >
                <Text style={styles.profileLinkText}>View profile</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.footerSpacer} />
            )}
            <TouchableOpacity
              onPress={() => confirmDeleteThread(item)}
              disabled={pendingThreadId === String(item.id)}
            >
              <Text
                style={[
                  styles.deleteLinkText,
                  pendingThreadId === String(item.id) && styles.deleteLinkDisabledText,
                ]}
              >
                {pendingThreadId === String(item.id)
                  ? 'Deleting…'
                  : 'Delete conversation'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [confirmDeleteThread, currentUserId, navigation, openProfile, pendingThreadId],
  );

  const keyExtractor = useCallback((item: Thread) => String(item.id), []);
  const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

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
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={isLoading && threads.length > 0}
          onRefresh={() => {
            loadThreads().catch(() => undefined);
          }}
        />
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.centered}>
            <Text>No conversations yet.</Text>
          </View>
        ) : null
      }
    />
  );
}

const getInitials = (value: string) => {
  if (!value) {
    return '?';
  }
  const [first, second] = value.trim().split(/\s+/);
  const firstInitial = first?.charAt(0)?.toUpperCase() ?? '';
  const secondInitial = second?.charAt(0)?.toUpperCase() ?? '';
  return (firstInitial + secondInitial).slice(0, 2) || firstInitial || '?';
};

const formatThreadTime = (dateString: string) => {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (sameDay) {
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: theme.palette.pearl,
  },
  listContent: {
    padding: theme.spacing.md,
    backgroundColor: theme.palette.pearl,
    gap: theme.spacing.md,
  },
  cardWrapper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  threadCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.palette.platinum,
    padding: theme.spacing.sm,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.palette.platinum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUnread: {
    backgroundColor: theme.colors.primary,
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.palette.graphite,
  },
  avatarLabelUnread: {
    color: '#fff',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  threadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.palette.graphite,
    flexShrink: 1,
  },
  threadTitleUnread: {
    color: theme.colors.primary,
  },
  threadTime: {
    fontSize: 12,
    color: theme.palette.silver,
  },
  threadPreview: {
    color: theme.palette.graphite,
  },
  threadPreviewUnread: {
    fontWeight: '600',
  },
  unreadPill: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  cardFooter: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerSpacer: {
    flex: 1,
  },
  profileLink: {
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
  },
  profileLinkText: { color: theme.colors.secondary, fontWeight: '600' },
  deleteLinkText: { color: '#dc2626', fontWeight: '600' },
  deleteLinkDisabledText: { color: '#fca5a5' },
  separator: { height: theme.spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
