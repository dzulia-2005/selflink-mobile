import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { env } from '@config/env';
import { useToast } from '@context/ToastContext';
import { useAuth } from '@hooks/useAuth';
import { useMessages } from '@hooks/useMessages';
import { RootStackParamList } from '@navigation/AppNavigator';
import {
  getTypingStatus,
  leaveThread,
  markThreadRead,
  sendTypingSignal,
  TypingStatus,
} from '@services/api/threads';
import { theme } from '@theme';

type MessagesRoute = RouteProp<RootStackParamList, 'Messages'>;

export function MessagesScreen() {
  const route = useRoute<MessagesRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const { token } = useAuth();
  const threadId = route.params.threadId;
  const [markingRead, setMarkingRead] = useState(false);
  const [typingSignal, setTypingSignal] = useState(false);
  const [typingStatus, setTypingStatus] = useState<TypingStatus | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const composerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const composerTypingActiveRef = useRef(false);
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
  } = useMessages({
    ordering: '-created_at',
    threadId,
    onThreadMissing: () => {
      toast.push({
        tone: 'info',
        message: 'This thread is no longer available.',
      });
      navigation.goBack();
    },
  });

  const handleMarkRead = useCallback(async () => {
    if (markingRead) {
      return;
    }
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

  const handleLeaveThread = useCallback(async () => {
    if (leaving) {
      return;
    }
    try {
      setLeaving(true);
      await leaveThread(threadId);
      toast.push({ tone: 'info', message: 'Left thread.' });
      navigation.goBack();
    } catch (error) {
      console.warn('MessagesScreen: leave thread failed', error);
      toast.push({ tone: 'error', message: 'Unable to leave thread.' });
    } finally {
      setLeaving(false);
    }
  }, [leaving, navigation, threadId, toast]);

  useEffect(() => {
    if (!token) {
      return;
    }
    let closed = false;
    let ws: WebSocket | null = null;

    const connect = () => {
      const realtime = new URL(env.realtimeUrl);
      realtime.searchParams.set('token', token);
      ws = new WebSocket(realtime.toString());
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'typing' && payload.thread_id === threadId) {
            if (payload.is_typing) {
              setTypingStatus({
                typing: true,
                userId: payload.user_id,
                userName: payload.user_name,
                userHandle: payload.user_handle,
              });
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              typingTimeoutRef.current = setTimeout(() => setTypingStatus(null), 7000);
            } else {
              setTypingStatus(null);
            }
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('MessagesScreen: ws parse error', error);
          }
        }
      };
      ws.onerror = (error) => {
        if (__DEV__) {
          console.warn('MessagesScreen: websocket error', error);
        }
      };
      ws.onclose = () => {
        setWsConnected(false);
        if (!closed) {
          setTimeout(connect, 5000);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      ws?.close();
      setWsConnected(false);
    };
  }, [threadId, token]);

  useEffect(() => {
    if (wsConnected) {
      return;
    }
    let cancelled = false;
    async function pollTyping() {
      try {
        const status = await getTypingStatus(threadId);
        if (!cancelled) {
          setTypingStatus(status.typing ? status : null);
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
  }, [threadId, wsConnected]);

  const notifyTyping = useCallback(
    async (active: boolean) => {
      try {
        await sendTypingSignal(threadId, { is_typing: active });
      } catch (error) {
        if (__DEV__) {
          console.warn('MessagesScreen: typing signal failed', error);
        }
      }
    },
    [threadId],
  );

  useEffect(() => {
    return () => {
      notifyTyping(false).catch(() => undefined);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (composerTimeoutRef.current) {
        clearTimeout(composerTimeoutRef.current);
      }
    };
  }, [notifyTyping]);

  const keyExtractor = useCallback((item: { id: number }) => String(item.id), []);

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.gradient}>
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
            <MetalButton
              title={leaving ? 'Leaving…' : 'Leave Thread'}
              onPress={handleLeaveThread}
              disabled={leaving}
            />
          </View>
          {typingStatus?.typing && (
            <Text style={styles.typingText}>
              {typingStatus.userName ??
                (typingStatus.userHandle
                  ? `@${typingStatus.userHandle}`
                  : 'Someone')}{' '}
              is typing…
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#fff"
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No transmissions yet</Text>
                <Text style={styles.emptyCopy}>
                  Start a conversation that feels crafted—not spammed.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.loader}>
                <ActivityIndicator color={theme.palette.platinum} />
              </View>
            ) : null
          }
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Send a signal…"
            placeholderTextColor={theme.palette.graphite}
            value={composer.body}
            onChangeText={(text) => {
              updateComposer(text);
              if (!composerTypingActiveRef.current) {
                composerTypingActiveRef.current = true;
                notifyTyping(true);
              }
              if (composerTimeoutRef.current) {
                clearTimeout(composerTimeoutRef.current);
              }
              composerTimeoutRef.current = setTimeout(() => {
                composerTypingActiveRef.current = false;
                notifyTyping(false);
              }, 5000);
            }}
            multiline
          />
          <MetalButton
            title={composer.sending || typingSignal ? 'Sending…' : 'Send'}
            onPress={async () => {
              setTypingSignal(true);
              await notifyTyping(true);
              await sendMessage();
              await notifyTyping(false);
              setTypingSignal(false);
            }}
            disabled={composer.sending}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
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
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.text.primary,
    backgroundColor: theme.colors.surface,
    ...theme.typography.body,
  },
});
