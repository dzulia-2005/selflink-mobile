import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useTheme, type Theme } from '@theme';

export function ThreadsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
        t('threads.alerts.deleteConfirm.title'),
        t('threads.alerts.deleteConfirm.body'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('threads.actions.deleteConversation'),
            style: 'destructive',
            onPress: () => {
              const key = String(thread.id);
              setPendingThreadId(key);
              removeThread(thread.id)
                .catch((err) => {
                  console.warn('ThreadsScreen: delete thread failed', err);
                  Alert.alert(
                    t('threads.alerts.deleteFailed.title'),
                    t('threads.alerts.deleteFailed.body'),
                  );
                })
                .finally(() => {
                  setPendingThreadId((current) => (current === key ? null : current));
                });
            },
          },
        ],
      );
    },
    [pendingThreadId, removeThread, t],
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
    [styles.separator],
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

  if (!isLoading && threads.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{t('threads.empty.title')}</Text>
        <Text style={styles.emptySubtitle}>
          {t('threads.empty.body')}
        </Text>
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
      refreshing={isLoading && threads.length > 0}
      onRefresh={handleRefresh}
      accessibilityLabel={t('threads.accessibility.threadsList')}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    list: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContent: {
      paddingVertical: 8,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loading: {
      marginTop: theme.spacing.lg,
    },
    empty: {
      padding: theme.spacing.lg,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.text.muted,
      ...theme.typography.body,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      backgroundColor: theme.colors.background,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: 8,
    },
    emptySubtitle: {
      textAlign: 'center',
      color: theme.text.muted,
      fontSize: 14,
    },
    error: {
      padding: theme.spacing.lg,
      color: theme.colors.error,
      ...theme.typography.body,
    },
  });
