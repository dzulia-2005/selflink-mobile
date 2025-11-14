import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import type { ListRenderItem } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChatBubble } from '@components/messaging/ChatBubble';
import { navigateToUserProfile } from '@navigation/helpers';
import type { Message } from '@schemas/messaging';
import {
  getTypingStatus,
  sendTypingSignal,
  type TypingStatus,
} from '@services/api/threads';
import { useAuthStore } from '@store/authStore';
import {
  useMessagingStore,
  type MessagingState,
  type ThreadTypingStatus,
} from '@store/messagingStore';
import { theme } from '@theme';

interface RouteParams {
  threadId: string;
  otherUserId?: number;
}

type ChatRoute = RouteProp<Record<'Chat', RouteParams>, 'Chat'>;

const EMPTY_MESSAGES: Message[] = [];
type ChatListItem =
  | { kind: 'separator'; id: string; label: string }
  | { kind: 'message'; id: string; message: Message; previousSenderId?: string | number };

const mapTypingStatusResponse = (status: TypingStatus): ThreadTypingStatus | null => {
  if (!status?.typing) {
    return null;
  }
  return {
    typing: true,
    userId: status.userId != null ? String(status.userId) : undefined,
    userName: status.userName ?? null,
    userHandle: status.userHandle ?? null,
  };
};

const isUnauthorizedError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const message = (error as { message?: string }).message;
  return typeof message === 'string' && message.includes('(401');
};

const logTypingError = (label: string, error: unknown) => {
  if (isUnauthorizedError(error)) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug(`${label} (unauthorized)`, error);
    }
    return;
  }
  console.warn(label, error);
};

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
  const setTypingStatus = useMessagingStore((state) => state.setTypingStatus);
  const threadKey = useMemo(() => String(threadId), [threadId]);
  const messages = useMessagingStore(
    useCallback(
      (state: MessagingState) => state.messagesByThread[threadKey] ?? EMPTY_MESSAGES,
      [threadKey],
    ),
  );
  const typingStatus = useMessagingStore(
    useCallback(
      (state: MessagingState) => state.typingByThread[threadKey] ?? null,
      [threadKey],
    ),
  );
  const isLoading = useMessagingStore((state) => state.isLoadingMessages);
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingActiveRef = useRef(false);
  const currentUserKey = currentUserId != null ? String(currentUserId) : null;

  useEffect(() => {
    loadThreadMessages(threadId).catch(() => undefined);
  }, [loadThreadMessages, threadId]);

  const headerProfileButton = useCallback(() => {
    if (!otherUserId) {
      return null;
    }
    return (
      <TouchableOpacity onPress={() => navigateToUserProfile(navigation, otherUserId)}>
        <Text style={styles.headerLink}>Profile</Text>
      </TouchableOpacity>
    );
  }, [navigation, otherUserId]);

  useLayoutEffect(() => {
    if (!otherUserId) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    navigation.setOptions({
      headerRight: headerProfileButton,
    });
  }, [headerProfileButton, navigation, otherUserId]);

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

  const notifyTyping = useCallback(
    async (active: boolean) => {
      try {
        await sendTypingSignal(threadId, { is_typing: active });
      } catch (error) {
        logTypingError('ChatScreen: typing signal failed', error);
      }
    },
    [threadId],
  );

  const scheduleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      typingActiveRef.current = false;
      notifyTyping(false).catch(() => undefined);
    }, 4_000);
  }, [notifyTyping]);

  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);
      if (!text.trim()) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        if (typingActiveRef.current) {
          typingActiveRef.current = false;
          notifyTyping(false).catch(() => undefined);
        }
        return;
      }
      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        notifyTyping(true).catch(() => undefined);
      }
      scheduleTypingStop();
    },
    [notifyTyping, scheduleTypingStop],
  );

  useEffect(() => {
    let cancelled = false;
    getTypingStatus(threadId)
      .then((status) => {
        if (cancelled) {
          return;
        }
        setTypingStatus(threadKey, mapTypingStatusResponse(status));
      })
      .catch((error) => {
        logTypingError('ChatScreen: failed to fetch typing status', error);
      });
    return () => {
      cancelled = true;
      setTypingStatus(threadKey, null);
    };
  }, [setTypingStatus, threadId, threadKey]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (typingActiveRef.current) {
        typingActiveRef.current = false;
        notifyTyping(false).catch(() => undefined);
      }
    };
  }, [notifyTyping]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) {
      return;
    }
    setIsSending(true);
    try {
      const payload = input.trim();
      if (__DEV__) {
        console.log('[ChatScreen] sendMessage', {
          threadId,
          preview: payload.slice(0, 32),
        });
      }
      await sendMessage(threadId, payload);
      setInput('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typingActiveRef.current) {
        typingActiveRef.current = false;
        notifyTyping(false).catch(() => undefined);
      }
    } catch (error: unknown) {
      console.warn('ChatScreen: failed to send message', error);
      const detail =
        typeof error === 'object' && error && 'response' in error
          ? ((error as any).response?.data?.detail ?? '')
          : '';
      Alert.alert('Unable to send message', detail || 'Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, notifyTyping, sendMessage, threadId]);

  const threadMessages = messages;
  const chatItems = useMemo<ChatListItem[]>(() => {
    const items: ChatListItem[] = [];
    let lastLabel: string | null = null;
    threadMessages.forEach((message, index) => {
      const label = formatDateLabel(message.created_at);
      if (label !== lastLabel) {
        items.push({
          kind: 'separator',
          id: `sep-${label}-${index}-${message.id}`,
          label,
        });
        lastLabel = label;
      }
      items.push({
        kind: 'message',
        id: String(message.id),
        message,
        previousSenderId: threadMessages[index - 1]?.sender.id,
      });
    });
    return items;
  }, [threadMessages]);
  const typingIndicatorVisible =
    Boolean(typingStatus?.typing) &&
    (!typingStatus?.userId || typingStatus.userId !== currentUserKey);

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

  const renderItem = useCallback<ListRenderItem<ChatListItem>>(
    ({ item }) => {
      if (item.kind === 'separator') {
        return <DateSeparator label={item.label} />;
      }
      const senderId = item.message.sender?.id;
      const isOwn =
        senderId != null && currentUserKey != null
          ? String(senderId) === currentUserKey
          : senderId === currentUserId;
      return (
        <ChatBubble
          message={item.message}
          isOwn={Boolean(isOwn)}
          showTimestamp
          onLongPress={confirmDeleteMessage}
          disableActions={Boolean(pendingDeleteId)}
        />
      );
    },
    [confirmDeleteMessage, currentUserId, currentUserKey, pendingDeleteId],
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
        data={chatItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        inverted
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={<View style={styles.listFooter} />}
      />
      {typingIndicatorVisible && typingStatus ? (
        <TypingIndicator status={typingStatus} />
      ) : null}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          value={input}
          onChangeText={handleInputChange}
          onBlur={() => {
            if (typingActiveRef.current) {
              typingActiveRef.current = false;
              notifyTyping(false).catch(() => undefined);
            }
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = null;
            }
          }}
          placeholderTextColor="#94A3B8"
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          style={styles.sendButton}
          disabled={isSending || !input.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={isSending || !input.trim() ? '#9CA3AF' : '#0f766e'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const formatDateLabel = (dateString: string) => {
  const target = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(target, today)) {
    return 'Today';
  }
  if (isSameDay(target, yesterday)) {
    return 'Yesterday';
  }
  return target.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const DateSeparator = ({ label }: { label: string }) => (
  <View style={styles.dateSeparator}>
    <View style={styles.dateSeparatorLine} />
    <Text style={styles.dateSeparatorLabel}>{label}</Text>
    <View style={styles.dateSeparatorLine} />
  </View>
);

const TypingIndicator = ({ status }: { status: ThreadTypingStatus }) => {
  const label = status.userName || status.userHandle || 'Someone';
  return (
    <View style={styles.typingIndicator}>
      <View style={styles.typingDots}>
        <View style={styles.typingDot} />
        <View style={styles.typingDot} />
        <View style={styles.typingDot} />
      </View>
      <Text style={styles.typingText}>{`${label} is typing…`}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  listContent: {
    paddingVertical: 8,
  },
  listFooter: {
    height: 32,
  },
  headerLink: {
    color: '#2563EB',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  dateSeparatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.palette.platinum,
  },
  dateSeparatorLabel: {
    ...theme.typography.caption,
    color: theme.palette.graphite,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.palette.graphite,
    opacity: 0.4,
  },
  typingText: {
    ...theme.typography.caption,
    color: theme.palette.graphite,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F9FAFB',
    fontSize: 15,
    color: theme.palette.graphite,
    textAlignVertical: 'top',
  },
  sendButton: {
    marginLeft: 8,
    padding: 10,
    borderRadius: 999,
  },
});
