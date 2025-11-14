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
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ListRenderItem } from 'react-native';

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
        if (__DEV__) {
          console.warn('ChatScreen: typing signal failed', error);
        }
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
        if (__DEV__) {
          console.warn('ChatScreen: failed to fetch typing status', error);
        }
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
        <MessageBubble
          message={item.message}
          isOwn={Boolean(isOwn)}
          previousSenderId={item.previousSenderId}
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
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Message"
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
          placeholderTextColor={theme.palette.silver}
          multiline
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
  previousSenderId?: string | number;
  onLongPress?: (message: Message) => void;
  disableActions?: boolean;
}) => {
  const previousKey = previousSenderId == null ? null : String(previousSenderId);
  const currentSenderKey = message.sender?.id != null ? String(message.sender.id) : null;
  const isSenderChanged = previousKey !== currentSenderKey;
  const containerStyle = [
    styles.bubbleRow,
    isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther,
    isSenderChanged ? styles.bubbleRowSeparated : styles.bubbleRowTight,
  ];
  const bubbleStyle = [
    styles.messageBubble,
    isOwn ? styles.bubbleOwn : styles.bubbleOther,
  ];
  const timestamp = formatTime(message.created_at);
  const avatarLabel = getInitials(message.sender.name || message.sender.handle || '');
  const avatarSource = message.sender.photo ? { uri: message.sender.photo } : null;
  const showAvatar = !isOwn && isSenderChanged;

  return (
    <View style={containerStyle}>
      {isOwn ? (
        <View style={styles.bubbleRowOwnSpacer} />
      ) : (
        <View style={[styles.avatar, !showAvatar && styles.avatarHidden]}>
          {avatarSource ? (
            <Image source={avatarSource} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarLabel}>{avatarLabel}</Text>
          )}
        </View>
      )}
      <TouchableOpacity
        activeOpacity={0.85}
        delayLongPress={250}
        onLongPress={() => {
          if (!disableActions) {
            onLongPress?.(message);
          }
        }}
        style={bubbleStyle}
      >
        {!isOwn && !!message.sender.name && (
          <Text style={styles.sender}>{message.sender.name}</Text>
        )}
        <Text
          style={[
            styles.messageText,
            isOwn ? styles.messageTextOwn : styles.messageTextOther,
          ]}
        >
          {message.body}
        </Text>
        <View
          style={[
            styles.bubbleMeta,
            isOwn ? styles.bubbleMetaOwn : styles.bubbleMetaOther,
          ]}
        >
          <Text
            style={[
              styles.timestamp,
              isOwn ? styles.timestampOwn : styles.timestampOther,
            ]}
          >
            {timestamp}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const getInitials = (name: string) => {
  if (!name) {
    return '?';
  }
  const [first, second] = name.trim().split(' ');
  const firstInitial = first?.charAt(0)?.toUpperCase() ?? '';
  const secondInitial = second?.charAt(0)?.toUpperCase() ?? '';
  return (firstInitial + secondInitial).slice(0, 2) || '?';
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

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
    backgroundColor: theme.palette.pearl,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
    gap: theme.spacing.xs,
  },
  listFooter: {
    height: theme.spacing.lg,
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
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.palette.pearl,
    maxHeight: 120,
    textAlignVertical: 'top',
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
  headerLink: {
    color: '#2563EB',
    fontWeight: '600',
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
    borderRadius: theme.radii.lg,
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
    borderBottomRightRadius: theme.radii.sm,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: theme.radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.palette.platinum,
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
  bubbleMeta: {
    marginTop: 6,
  },
  bubbleMetaOwn: {
    alignItems: 'flex-end',
  },
  bubbleMetaOther: {
    alignItems: 'flex-start',
  },
  timestamp: {
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
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
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
});
