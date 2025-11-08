import { RouteProp, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageBubble } from '@components/MessageBubble';
import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import { useMessages } from '@hooks/useMessages';
import { RootStackParamList } from '@navigation/AppNavigator';
import { theme } from '@theme/index';
import {
  getTypingStatus,
  markThreadRead,
  sendTypingSignal,
  TypingStatus,
} from '@services/api/threads';

type MessagesRoute = RouteProp<RootStackParamList, 'Messages'>;

export function MessagesScreen() {
  const route = useRoute<MessagesRoute>();
  const toast = useToast();
  const threadId = route.params.threadId;
  const [markingRead, setMarkingRead] = useState(false);
  const [typingSignal, setTypingSignal] = useState(false);
  const [typingStatus, setTypingStatus] = useState<TypingStatus | null>(null);
  const {
    messages,
    loading,
    refreshing,
    loadMore,
    hasMore,
    composer,
    updateComposer,
    sendMessage,
    refresh,
  } = useMessages({ ordering: '-created_at', threadId });

  const handleMarkRead = useCallback(async () => {
    if (markingRead) return;
    try {
      setMarkingRead(true);
      await markThreadRead(threadId);
      toast.push({ tone: 'info', message: 'Marked as read.' });
    } catch (error) {
      console.warn('MessagesScreen: mark read failed', error);
      toast.push({ tone: 'error', message: 'Unable to mark thread read.' });
    } finally {
      setMarkingRead(false);
    }
  }, [markingRead, threadId, toast]);

  useEffect(() => {
    let cancelled = false;
    async function pollTyping() {
      try {
        const status = await getTypingStatus(threadId);
        if (!cancelled) {
          setTypingStatus(status);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('MessagesScreen: typing status error', error);
        }
      }
    }
    pollTyping();
    const interval = setInterval(pollTyping, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [threadId]);

  const keyExtractor = useCallback((item: { id: number }) => String(item.id), []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <MetalPanel glow>
        <Text style={styles.heroTitle}>Messages</Text>
        <Text style={styles.heroSubtitle}>
          Inspired by Jobs’ obsession for detail, tempered by Linus’ clarity, aiming for
          Musk-scale reach.
        </Text>
        <View style={styles.actionRow}>
          <MetalButton
            title={markingRead ? 'Marking…' : 'Mark as Read'}
            onPress={handleMarkRead}
            disabled={markingRead}
          />
        </View>
        {typingStatus?.typing && (
          <Text style={styles.typingText}>
            {typingStatus.user?.name ?? typingStatus.user?.handle ?? 'Someone'} is typing…
          </Text>
        )}
      </MetalPanel>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={messages}
        inverted
        keyExtractor={keyExtractor}
        renderItem={({ item }) => <MessageBubble message={item} />}
        onEndReachedThreshold={0.2}
        onEndReached={() => {
          if (hasMore && !loading && !refreshing) {
            loadMore();
          }
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No transmissions yet</Text>
              <Text style={styles.emptyCopy}>
                Start a conversation that feels crafted—not spammed.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loading && (
            <View style={styles.loader}>
              <ActivityIndicator color={theme.palette.platinum} />
            </View>
          )
        }
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Send a signal…"
          placeholderTextColor={theme.palette.graphite}
          value={composer.body}
          onChangeText={updateComposer}
          multiline
        />
        <MetalButton
          title={composer.sending || typingSignal ? 'Sending…' : 'Send'}
          onPress={async () => {
            setTypingSignal(true);
            await sendTypingSignal(threadId).catch(() => undefined);
            await sendMessage();
            setTypingSignal(false);
          }}
          disabled={composer.sending}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  heroTitle: {
    color: theme.palette.platinum,
    ...theme.typography.title,
  },
  heroSubtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typingText: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    marginTop: theme.spacing.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.lg,
  },
  empty: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
  emptyCopy: {
    color: theme.palette.silver,
    ...theme.typography.body,
    textAlign: 'center',
  },
  loader: {
    paddingVertical: theme.spacing.md,
  },
  composer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.palette.graphite,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.palette.platinum,
    backgroundColor: theme.palette.obsidian,
    ...theme.typography.body,
  },
});
