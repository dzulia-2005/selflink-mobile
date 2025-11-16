import { Ionicons } from '@expo/vector-icons';
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
import type { ListRenderItem } from 'react-native';
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

import { ChatBubble } from '@components/messaging/ChatBubble';
import TypingIndicator from '@components/messaging/TypingIndicator';
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
  const listRef = useRef<FlatList<Message> | null>(null);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });
  }, [messages]);

  useEffect(() => {
    loadThreadMessages(threadId).catch(() => undefined);
  }, [loadThreadMessages, threadId]);

  useEffect(() => {
    if (listRef.current && sortedMessages.length > 0) {
      listRef.current.scrollToEnd({ animated: true });
    }
  }, [sortedMessages.length]);

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

  const renderMessage = useCallback<ListRenderItem<Message>>(
    ({ item, index }) => {
      const senderId = item.sender?.id != null ? String(item.sender.id) : null;
      const isOwn =
        senderId != null && currentUserKey != null ? senderId === currentUserKey : false;
      const previous = sortedMessages[index - 1];
      const next = sortedMessages[index + 1];
      const currentSenderKey =
        senderId ?? (item.sender?.id != null ? String(item.sender.id) : null);
      const prevSenderKey =
        previous?.sender?.id != null ? String(previous.sender.id) : null;
      const nextSenderKey = next?.sender?.id != null ? String(next.sender.id) : null;
      const sameSenderAsPrev =
        prevSenderKey != null && currentSenderKey != null
          ? prevSenderKey === currentSenderKey
          : prevSenderKey === currentSenderKey;
      const sameSenderAsNext =
        nextSenderKey != null && currentSenderKey != null
          ? nextSenderKey === currentSenderKey
          : nextSenderKey === currentSenderKey;

      return (
        <ChatBubble
          message={item}
          isOwn={Boolean(isOwn)}
          isFirstInGroup={!sameSenderAsNext}
          isLastInGroup={!sameSenderAsPrev}
          showTimestamp={!sameSenderAsPrev}
          status={isOwn ? 'read' : undefined}
          onLongPress={confirmDeleteMessage}
          disableActions={Boolean(pendingDeleteId)}
        />
      );
    },
    [confirmDeleteMessage, currentUserKey, pendingDeleteId, sortedMessages],
  );

  if (isLoading && messages.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={sortedMessages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={<View style={styles.listFooter} />}
      />
      {typingIndicatorVisible ? (
        <View style={styles.typingWrapper}>
          <TypingIndicator />
        </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
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
  typingWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 4,
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
