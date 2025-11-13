import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { navigateToUserProfile } from '@navigation/helpers';
import { useAuthStore } from '@store/authStore';
import { useMessagingStore, type MessagingState } from '@store/messagingStore';
import type { ListRenderItem } from 'react-native';
import type { Message } from '@schemas/messaging';
import { theme } from '@theme';

interface RouteParams {
  threadId: number;
  otherUserId?: number;
}

type ChatRoute = RouteProp<Record<'Chat', RouteParams>, 'Chat'>;

const EMPTY_MESSAGES: Message[] = [];

export function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ChatRoute>();
  const threadId = route.params.threadId;
  const otherUserId = route.params.otherUserId;
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const loadThreadMessages = useMessagingStore((state) => state.loadThreadMessages);
  const sendMessage = useMessagingStore((state) => state.sendMessage);
  const markThreadRead = useMessagingStore((state) => state.markThreadRead);
  const setActiveThread = useMessagingStore((state) => state.setActiveThread);
  const syncThreads = useMessagingStore((state) => state.syncThreads);
  const removeMessage = useMessagingStore((state) => state.removeMessage);
  const threadKey = useMemo(() => String(threadId), [threadId]);
  const messagesSelector = useMemo(
    () => (state: MessagingState) => state.messagesByThread[threadKey],
    [threadKey],
  );
  const messages = useMessagingStore(messagesSelector) ?? undefined;
  const isLoading = useMessagingStore((state) => state.isLoadingMessages);
  const currentUserId = useAuthStore((state) => state.currentUser?.id);

  useEffect(() => {
    loadThreadMessages(threadId).catch(() => undefined);
  }, [loadThreadMessages, threadId]);

  useLayoutEffect(() => {
    if (!otherUserId) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigateToUserProfile(navigation, otherUserId)}>
          <Text style={{ color: '#2563EB', fontWeight: '600' }}>Profile</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, otherUserId]);

  useFocusEffect(
    useCallback(() => {
      setActiveThread(threadKey);
      markThreadRead(threadKey).catch(() => undefined);
      return () => {
        setActiveThread(null);
        syncThreads().catch(() => undefined);
      };
    }, [markThreadRead, setActiveThread, syncThreads, threadKey]),
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) {
      return;
    }
    setIsSending(true);
    try {
      const payload = input.trim();
      if (__DEV__) {
        console.log('[ChatScreen] sendMessage', { threadId, preview: payload.slice(0, 32) });
      }
      await sendMessage(threadId, payload);
      setInput('');
    } catch (error: unknown) {
      console.warn('ChatScreen: failed to send message', error);
      const detail =
        typeof error === 'object' && error && 'response' in error
          ? (error as any).response?.data?.detail ?? ''
          : '';
      Alert.alert('Unable to send message', detail || 'Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, sendMessage, threadId]);

  const threadMessages = useMemo(() => messages ?? EMPTY_MESSAGES, [messages]);

  const confirmDeleteMessage = useCallback(
    (message: Message) => {
      if (pendingDeleteId) {
        return;
      }
      Alert.alert('Delete message?', 'This removes the message for you only.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete for me',
          style: 'destructive',
          onPress: () => {
            const key = String(message.id);
            setPendingDeleteId(key);
            removeMessage(threadId, message.id)
              .catch((error) => {
                console.warn('ChatScreen: delete message failed', error);
                Alert.alert('Unable to delete message', 'Please try again.');
              })
              .finally(() => {
                setPendingDeleteId((current) => (current === key ? null : current));
              });
          },
        },
      ]);
    },
    [pendingDeleteId, removeMessage, threadId],
  );

  const renderMessage = useCallback<ListRenderItem<Message>>(
    ({ item, index }) => {
      const previousSenderId = threadMessages[index - 1]?.sender.id;
      const isOwn = currentUserId === item.sender.id;
      return (
        <MessageBubble
          message={item}
          isOwn={isOwn}
          previousSenderId={previousSenderId}
          onLongPress={confirmDeleteMessage}
          disableActions={Boolean(pendingDeleteId)}
        />
      );
    },
    [confirmDeleteMessage, currentUserId, pendingDeleteId, threadMessages],
  );

  if (isLoading && threadMessages.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={threadMessages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        inverted
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Message"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
          disabled={isSending}
        >
          <Text style={styles.sendButtonText}>{isSending ? 'Sending…' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const MessageBubble = ({
  message,
  isOwn,
  previousSenderId,
  onLongPress,
  disableActions,
}: {
  message: Message;
  isOwn: boolean;
  previousSenderId?: number;
  onLongPress?: (message: Message) => void;
  disableActions?: boolean;
}) => {
  const isSenderChanged = previousSenderId !== message.sender.id;
  const containerStyle = [
    styles.bubbleRow,
    isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther,
    isSenderChanged ? styles.bubbleRowSeparated : styles.bubbleRowTight,
  ];
  const bubbleStyle = [styles.messageBubble, isOwn ? styles.bubbleOwn : styles.bubbleOther];
  const timestamp = formatTimestamp(message.created_at);
  const avatarLabel = getInitials(message.sender.name || message.sender.handle || '');

  return (
    <View style={containerStyle}>
      {isOwn ? (
        <View style={styles.bubbleRowOwnSpacer} />
      ) : (
        <View style={[styles.avatar, !isSenderChanged && styles.avatarHidden]}>
          <Text style={styles.avatarLabel}>{avatarLabel}</Text>
        </View>
      )}
      <TouchableOpacity
        activeOpacity={0.8}
        delayLongPress={250}
        onLongPress={() => {
          if (!disableActions) {
            onLongPress?.(message);
          }
        }}
        style={bubbleStyle}
      >
        {!isOwn && <Text style={styles.sender}>{message.sender.name}</Text>}
        <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>
          {message.body}
        </Text>
        <Text style={[styles.timestamp, isOwn ? styles.timestampOwn : styles.timestampOther]}>
          {timestamp}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const [first, second] = name.trim().split(' ');
  const firstInitial = first?.charAt(0)?.toUpperCase() ?? '';
  const secondInitial = second?.charAt(0)?.toUpperCase() ?? '';
  return (firstInitial + secondInitial).slice(0, 2) || '?';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.pearl,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  composer: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
    margin: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.palette.platinum,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: theme.palette.pearl,
  },
  sendButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.sm,
  },
  bubbleRowOwn: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  bubbleRowSeparated: {
    marginTop: theme.spacing.sm,
  },
  bubbleRowTight: {
    marginTop: theme.spacing.xs,
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleOwn: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTextOwn: {
    color: theme.text.inverted,
  },
  messageTextOther: {
    color: theme.palette.graphite,
  },
  sender: {
    fontWeight: '600',
    marginBottom: 4,
    color: theme.palette.graphite,
  },
  timestamp: {
    marginTop: 6,
    fontSize: 12,
  },
  timestampOwn: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  timestampOther: {
    color: theme.palette.silver,
    textAlign: 'left',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.palette.platinum,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  avatarHidden: {
    opacity: 0,
  },
  avatarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.palette.graphite,
  },
  bubbleRowOwnSpacer: {
    width: 32,
    marginRight: theme.spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
