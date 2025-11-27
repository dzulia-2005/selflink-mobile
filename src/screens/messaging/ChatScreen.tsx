import { Ionicons } from '@expo/vector-icons';
import {
  RouteProp,
  useFocusEffect,
  useIsFocused,
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
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { toggleReaction } from '@api/messaging';
import { ChatBubble } from '@components/messaging/ChatBubble';
import TypingIndicator from '@components/messaging/TypingIndicator';
import { useMultiImagePicker } from '@hooks/useMultiImagePicker';
import { useVideoPicker, type PickedVideo } from '@hooks/useVideoPicker';
import { navigateToUserProfile } from '@navigation/helpers';
import type { Message, MessageStatus, PendingAttachment } from '@schemas/messaging';
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

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDayLabel = (value: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(value, today)) {
    return 'Today';
  }
  if (isSameDay(value, yesterday)) {
    return 'Yesterday';
  }
  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: value.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
};

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
  const isFocused = useIsFocused();
  const [input, setInput] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<PickedVideo | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [actionTarget, setActionTarget] = useState<Message | null>(null);
  const [isReactionSending, setIsReactionSending] = useState(false);
  const loadThreadMessages = useMessagingStore((state) => state.loadThreadMessages);
  const sendMessage = useMessagingStore((state) => state.sendMessage);
  const markThreadRead = useMessagingStore((state) => state.markThreadRead);
  const setActiveThread = useMessagingStore((state) => state.setActiveThread);
  const syncThreads = useMessagingStore((state) => state.syncThreads);
  const removeMessage = useMessagingStore((state) => state.removeMessage);
  const setTypingStatus = useMessagingStore((state) => state.setTypingStatus);
  const retryPendingMessage = useMessagingStore((state) => state.retryPendingMessage);
  const applyReaction = useMessagingStore((state) => state.applyReaction);
  const {
    images: selectedImages,
    pickImages,
    removeImage,
    clearImages,
    canAddMore: canAddMoreImages,
    isPicking: isPickingImages,
  } = useMultiImagePicker();
  const { pickVideo, isPicking: isPickingVideo } = useVideoPicker();
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
  const reactionEmojis = useMemo(() => ['❤️', '👍', '😂', '😮', '😢', '🙏'], []);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });
  }, [messages]);

  const pendingAttachments: PendingAttachment[] = useMemo(() => {
    const next: PendingAttachment[] = [];
    if (selectedVideo) {
      next.push({
        uri: selectedVideo.uri,
        type: 'video',
        mime: selectedVideo.type ?? 'video/mp4',
        width: selectedVideo.width ?? undefined,
        height: selectedVideo.height ?? undefined,
        duration: selectedVideo.duration ?? undefined,
        name: selectedVideo.name,
      });
      return next;
    }
    if (selectedImages.length) {
      next.push(
        ...selectedImages.map((img) => ({
          uri: img.uri,
          type: 'image' as const,
          mime: img.type ?? 'image/jpeg',
          name: img.name,
        })),
      );
    }
    return next;
  }, [selectedImages, selectedVideo]);

  useEffect(() => {
    loadThreadMessages(threadId).catch(() => undefined);
  }, [loadThreadMessages, threadId]);

  useEffect(() => {
    if (listRef.current && sortedMessages.length > 0) {
      listRef.current.scrollToEnd({ animated: true });
    }
  }, [sortedMessages.length]);

  useEffect(() => {
    if (!isFocused || !sortedMessages.length) {
      return;
    }
    const latest = sortedMessages[sortedMessages.length - 1];
    if (!latest?.id) {
      return;
    }
    markThreadRead(threadKey, { lastMessageId: String(latest.id) }).catch(() => undefined);
  }, [isFocused, markThreadRead, sortedMessages, threadKey]);

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
      const latest =
        useMessagingStore.getState().messagesByThread[threadKey]?.slice(-1)[0]?.id ??
        null;
      markThreadRead(threadKey, {
        lastMessageId: latest ? String(latest) : undefined,
      }).catch(() => undefined);
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

  const handlePickImages = useCallback(async () => {
    if (selectedVideo) {
      Alert.alert('Remove video first', 'You can attach photos or a video, not both.');
      return;
    }
    await pickImages();
  }, [pickImages, selectedVideo]);

  const handlePickVideo = useCallback(async () => {
    if (selectedImages.length > 0) {
      Alert.alert('Photos already attached', 'Remove photos before attaching a video.');
      return;
    }
    const video = await pickVideo();
    if (video) {
      setSelectedVideo(video);
    }
  }, [pickVideo, selectedImages.length]);

  const handleRemoveAttachment = useCallback(
    (attachment: PendingAttachment) => {
      if (attachment.type === 'video') {
        setSelectedVideo(null);
        return;
      }
      removeImage(attachment.uri);
    },
    [removeImage],
  );

  const openMessageActions = useCallback(
    (message: Message) => {
      if (pendingDeleteId) {
        return;
      }
      setActionTarget(message);
    },
    [pendingDeleteId],
  );

  const closeMessageActions = useCallback(() => {
    if (isReactionSending) {
      return;
    }
    setActionTarget(null);
  }, [isReactionSending]);

  const handleSelectReaction = useCallback(
    async (emoji: string) => {
      if (!actionTarget) {
        return;
      }
      const messageId = String(actionTarget.id);
      const latest =
        useMessagingStore
          .getState()
          .messagesByThread[threadKey]?.find((msg) => String(msg.id) === messageId) ??
        actionTarget;
      const hasReacted = latest?.reactions?.some(
        (reaction) => reaction.emoji === emoji && reaction.reactedByCurrentUser,
      );
      const optimisticAction = hasReacted ? 'removed' : 'added';
      applyReaction({
        threadId: threadKey,
        messageId,
        emoji,
        action: optimisticAction as 'added' | 'removed',
        userId: currentUserKey,
      });
      setIsReactionSending(true);
      try {
        await toggleReaction(messageId, emoji);
      } catch (error) {
        applyReaction({
          threadId: threadKey,
          messageId,
          emoji,
          action: hasReacted ? 'added' : 'removed',
          userId: currentUserKey,
        });
        console.warn('ChatScreen: reaction toggle failed', error);
        Alert.alert('Unable to react', 'Please try again.');
      } finally {
        setIsReactionSending(false);
        setActionTarget(null);
      }
    },
    [actionTarget, applyReaction, currentUserKey, threadKey],
  );

  const handleReplyAction = useCallback(() => {
    if (!actionTarget) {
      return;
    }
    setReplyingTo(actionTarget);
    setActionTarget(null);
  }, [actionTarget]);

  const clearReply = useCallback(() => setReplyingTo(null), []);

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
    const trimmed = input.trim();
    if ((trimmed.length === 0 && pendingAttachments.length === 0) || isSending) {
      return;
    }
    setIsSending(true);
    try {
      if (__DEV__) {
        console.log('[ChatScreen] sendMessage', {
          threadId,
          preview: trimmed.slice(0, 32),
          attachments: pendingAttachments.length,
        });
      }
      await sendMessage(threadId, trimmed, pendingAttachments, replyingTo?.id ?? null);
      setInput('');
      setSelectedVideo(null);
      clearImages();
      setReplyingTo(null);
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
  }, [
    clearImages,
    input,
    isSending,
    notifyTyping,
    pendingAttachments,
    replyingTo,
    sendMessage,
    threadId,
  ]);

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

  const handleRetry = useCallback(
    (message: Message) => {
      const clientUuid =
        (message as any)?.client_uuid ??
        (message as any)?.clientUuid ??
        (typeof message.id === 'string' ? message.id : null);
      if (!clientUuid) {
        return;
      }
      retryPendingMessage(String(clientUuid)).catch((error) => {
        console.warn('ChatScreen: retry send failed', error);
        Alert.alert('Unable to send message', 'Please try again.');
      });
    },
    [retryPendingMessage],
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
      const statusForBubble: MessageStatus | undefined = isOwn
        ? ((item.status as MessageStatus | undefined) ?? 'sent')
        : undefined;
      const showDaySeparator =
        index === 0 ||
        !isSameDay(
          new Date(item.created_at),
          new Date(sortedMessages[index - 1]?.created_at ?? item.created_at),
        );

      return (
        <View>
          {showDaySeparator ? (
            <View style={styles.daySeparator}>
              <Text style={styles.daySeparatorText}>
                {formatDayLabel(new Date(item.created_at))}
              </Text>
            </View>
          ) : null}
          <ChatBubble
            message={item}
            isOwn={Boolean(isOwn)}
            isFirstInGroup={!sameSenderAsNext}
            isLastInGroup={!sameSenderAsPrev}
            showTimestamp={!sameSenderAsPrev}
            status={statusForBubble}
            onLongPress={openMessageActions}
            disableActions={Boolean(pendingDeleteId)}
            onRetry={statusForBubble === 'failed' ? handleRetry : undefined}
          />
        </View>
      );
    },
    [
      currentUserKey,
      handleRetry,
      openMessageActions,
      pendingDeleteId,
      sortedMessages,
    ],
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
      {replyingTo ? (
        <View style={styles.replyContainer}>
          <View style={styles.replyTextContainer}>
            <Text style={styles.replyLabel}>
              Replying to {replyingTo.sender?.name ?? 'Message'}
            </Text>
            <Text style={styles.replyPreview} numberOfLines={1}>
              {replyingTo.body?.trim()
                ? replyingTo.body
                : replyingTo.attachments?.length
                  ? 'Attachment'
                  : 'Message'}
            </Text>
          </View>
          <TouchableOpacity onPress={clearReply} style={styles.replyCloseButton}>
            <Ionicons name="close" size={16} color="#0f172a" />
          </TouchableOpacity>
        </View>
      ) : null}
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
      {pendingAttachments.length ? (
        <ScrollView
          horizontal
          style={styles.attachmentsPreview}
          contentContainerStyle={styles.attachmentsPreviewContent}
          showsHorizontalScrollIndicator={false}
        >
          {pendingAttachments.map((attachment) => (
            <View
              key={`${attachment.uri}-${attachment.type}`}
              style={styles.attachmentChip}
            >
              {attachment.type === 'image' ? (
                <Image source={{ uri: attachment.uri }} style={styles.attachmentThumb} />
              ) : (
                <View style={styles.attachmentVideo}>
                  <Ionicons name="videocam" size={18} color="#0f172a" />
                  <Text style={styles.attachmentLabel}>Video</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => handleRemoveAttachment(attachment)}
                style={styles.removeAttachmentButton}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : null}
      {typingIndicatorVisible ? (
        <View style={styles.typingWrapper}>
          <TypingIndicator />
        </View>
      ) : null}
      <View style={styles.inputBar}>
        <View style={styles.attachmentButtons}>
          <TouchableOpacity
            onPress={handlePickImages}
            disabled={
              !canAddMoreImages || Boolean(selectedVideo) || isPickingImages || isSending
            }
            style={styles.attachmentButton}
          >
            <Ionicons
              name="image-outline"
              size={20}
              color={
                !canAddMoreImages || selectedVideo || isPickingImages || isSending
                  ? '#9CA3AF'
                  : '#0f766e'
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePickVideo}
            disabled={
              Boolean(selectedVideo) ||
              selectedImages.length > 0 ||
              isPickingVideo ||
              isSending
            }
            style={styles.attachmentButton}
          >
            <Ionicons
              name="videocam-outline"
              size={20}
              color={
                selectedVideo || selectedImages.length > 0 || isPickingVideo || isSending
                  ? '#9CA3AF'
                  : '#0f766e'
              }
            />
          </TouchableOpacity>
        </View>
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
          disabled={
            isSending || (input.trim().length === 0 && pendingAttachments.length === 0)
          }
        >
          <Ionicons
            name="send"
            size={20}
            color={
              isSending || (input.trim().length === 0 && pendingAttachments.length === 0)
                ? '#9CA3AF'
                : '#0f766e'
            }
          />
        </TouchableOpacity>
      </View>
      <Modal
        visible={Boolean(actionTarget)}
        transparent
        animationType="fade"
        onRequestClose={closeMessageActions}
      >
        <View style={styles.actionBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeMessageActions}
          />
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>Message actions</Text>
            <View style={styles.reactionRow}>
              {reactionEmojis.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionButton}
                  onPress={() => handleSelectReaction(emoji)}
                  disabled={isReactionSending}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleReplyAction}
                disabled={isReactionSending}
              >
                <Text style={styles.actionButtonText}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  if (actionTarget) {
                    confirmDeleteMessage(actionTarget);
                  }
                  closeMessageActions();
                }}
                disabled={isReactionSending}
              >
                <Text style={[styles.actionButtonText, styles.destructiveText]}>
                  Delete
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={closeMessageActions}>
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  replyTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  replyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  replyPreview: {
    marginTop: 2,
    color: '#475569',
    fontSize: 12,
  },
  replyCloseButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
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
  attachmentButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
  },
  attachmentButton: {
    padding: 6,
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
  attachmentsPreview: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  attachmentsPreviewContent: {
    alignItems: 'center',
  },
  attachmentChip: {
    position: 'relative',
    marginRight: 8,
  },
  attachmentThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  attachmentVideo: {
    width: 96,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  attachmentLabel: {
    marginLeft: 6,
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 999,
    padding: 4,
  },
  daySeparator: {
    alignItems: 'center',
    marginVertical: 8,
  },
  daySeparatorText: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  actionSheet: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  reactionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reactionButton: {
    marginRight: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  reactionEmoji: {
    fontSize: 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  destructiveText: {
    color: '#DC2626',
  },
});
