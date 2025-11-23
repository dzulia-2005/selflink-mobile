import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { MentorMessageContent } from '@components/chat/MentorMessageContent';
import { useToast } from '@context/ToastContext';
import {
  fetchMentorHistory,
  sendMentorChat,
  type MentorHistoryMessage,
} from '@services/api/mentorSessions';
import { useAuthStore } from '@store/authStore';
import { chatTheme } from '@theme/chat';
import { theme } from '@theme/index';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChatMessage = Omit<MentorHistoryMessage, 'id'> & { id: string };

// Chat layout lives here; mentor content rendering is in
// @components/chat/MentorMessageContent and bubble/theme tokens in @theme/chat.
const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort(
    (a, b) => new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf(),
  );

const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
  if (!incoming.length) {
    return current;
  }
  const map = new Map<string, ChatMessage>();
  current.forEach((msg) => map.set(msg.id, msg));
  incoming.forEach((msg) => map.set(msg.id, msg));
  return sortMessages(Array.from(map.values()));
};

const normalizeHistory = (items: MentorHistoryMessage[]): ChatMessage[] =>
  items.map((item) => ({
    ...item,
    id: String(item.id),
    meta: item.meta ?? null,
  }));

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return '';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function MentorChatScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [inputHeight, setInputHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [shouldScrollToEnd, setShouldScrollToEnd] = useState(false);
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollToEnd({ animated: true });
    }
  }, []);

  const loadHistory = useCallback(
    async (
      cursor?: string | null,
      mode: 'replace' | 'append' = 'replace',
      silent = false,
    ) => {
      const append = mode === 'append';
      if (append) {
        setLoadingMore(true);
      } else if (!silent) {
        setIsLoading(true);
      }
      try {
        const response = await fetchMentorHistory(cursor ?? undefined);
        const normalized = normalizeHistory(response.results);
        setNextCursor(response.next);
        if (append) {
          setMessages((current) => mergeMessages(current, normalized));
        } else {
          setMessages(sortMessages(normalized));
          setShouldScrollToEnd(true);
        }
      } catch (error) {
        console.error('MentorChatScreen: failed to load history', error);
        toast.push({ message: 'Unable to load mentor history.', tone: 'error' });
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          if (!silent) {
            setIsLoading(false);
          }
          setRefreshing(false);
        }
      }
    },
    [toast],
  );

  useEffect(() => {
    loadHistory().catch(() => undefined);
  }, [loadHistory]);

  useEffect(() => {
    if (shouldScrollToEnd && listRef.current && messages.length > 0) {
      requestAnimationFrame(scrollToBottom);
      setShouldScrollToEnd(false);
    }
  }, [messages.length, scrollToBottom, shouldScrollToEnd]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setShouldScrollToEnd(true);
    });
    return () => {
      showSub.remove();
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory(undefined, 'replace', true).catch(() => undefined);
  }, [loadHistory]);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loadingMore || isLoading) {
      return;
    }
    loadHistory(nextCursor, 'append').catch(() => undefined);
  }, [isLoading, loadHistory, loadingMore, nextCursor]);

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await Clipboard.setStringAsync(text);
        toast.push({ message: 'Copied to clipboard', tone: 'info', duration: 1500 });
      } catch (error) {
        console.warn('MentorChatScreen: copy failed', error);
        toast.push({ message: 'Unable to copy right now.', tone: 'error' });
      }
    },
    [toast],
  );

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const trimmed = (overrideText ?? input).trim();
      if (!trimmed || isSending) {
        return;
      }
      const userLanguage =
        currentUser?.settings?.language ||
        (currentUser?.locale ? currentUser.locale.split('-')[0] : undefined);
      const now = new Date().toISOString();
      const optimisticUser: ChatMessage = {
        id: `local-user-${Date.now()}`,
        session_id: 0,
        role: 'user',
        content: trimmed,
        meta: null,
        created_at: now,
      };
      setMessages((current) => sortMessages([...current, optimisticUser]));
      setInput('');
      setInputHeight(0);
      setIsSending(true);
      setAwaitingReply(true);
      setSendError(null);
      setLastFailedMessage(null);
      setShouldScrollToEnd(true);

      try {
        const response = await sendMentorChat({
          message: trimmed,
          mode: 'default',
          language: userLanguage || undefined,
        });
        const sessionId = response.session_id;
        const userMessage: ChatMessage = {
          id: String(response.user_message_id ?? optimisticUser.id),
          session_id: sessionId,
          role: 'user',
          content: trimmed,
          meta: response.meta?.user_flags ?? null,
          created_at: now,
        };
        const mentorMessage: ChatMessage = {
          id: String(response.mentor_message_id ?? `mentor-${Date.now()}`),
          session_id: sessionId,
          role: 'mentor',
          content: response.mentor_reply,
          meta: response.meta?.mentor_flags ?? null,
          created_at: new Date().toISOString(),
        };

        setMessages((current) =>
          mergeMessages(
            current.filter((msg) => msg.id !== optimisticUser.id),
            [userMessage, mentorMessage],
          ),
        );
        setShouldScrollToEnd(true);
      } catch (error) {
        console.error('MentorChatScreen: failed to send mentor chat', error);
        setMessages((current) => current.filter((msg) => msg.id !== optimisticUser.id));
        setInput(trimmed);
        setSendError('Mentor is temporarily unavailable. Please try again.');
        setLastFailedMessage(trimmed);
      } finally {
        setIsSending(false);
        setAwaitingReply(false);
      }
    },
    [currentUser?.locale, currentUser?.settings?.language, input, isSending],
  );

  const handleSend = useCallback(() => {
    void sendMessage();
  }, [sendMessage]);

  const handleResend = useCallback(() => {
    if (!lastFailedMessage) {
      return;
    }
    void sendMessage(lastFailedMessage);
  }, [lastFailedMessage, sendMessage]);

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const previous = messages[index - 1];
      const showSessionDivider = !previous || previous.session_id !== item.session_id;
      const isUser = item.role === 'user';
      const marginTop =
        previous && previous.role === item.role
          ? chatTheme.spacing.xs
          : chatTheme.spacing.md;
      const sessionLabel =
        item.session_id && item.session_id > 0
          ? `Session #${item.session_id}`
          : 'New session';
      const onLongPress =
        !isUser && item.content
          ? () => {
              handleCopy(item.content);
            }
          : undefined;
      return (
        <View>
          {showSessionDivider ? (
            <Text style={styles.sessionLabel}>{sessionLabel}</Text>
          ) : null}
          <View
            style={[
              styles.messageRow,
              isUser ? styles.messageRowRight : styles.messageRowLeft,
              { marginTop },
            ]}
          >
            <Pressable delayLongPress={350} onLongPress={onLongPress}>
              <View
                style={[
                  styles.bubble,
                  isUser ? styles.userBubble : styles.mentorBubble,
                  item.role === 'mentor' ? styles.mentorShadow : null,
                ]}
              >
                {item.role === 'mentor' ? (
                  <MentorMessageContent text={item.content} collapsibleLines={12} />
                ) : (
                  <Text style={styles.userText}>{item.content}</Text>
                )}
                <Text
                  style={[
                    styles.timestamp,
                    isUser ? styles.timestampUser : styles.timestampMentor,
                  ]}
                >
                  {formatTime(item.created_at)}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      );
    },
    [handleCopy, messages],
  );

  const footer = useMemo(() => {
    return (
      <View style={styles.footer}>
        {awaitingReply ? (
          <View style={[styles.messageRow, styles.messageRowLeft, styles.typingRow]}>
            <View style={[styles.bubble, styles.mentorBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color={chatTheme.bubble.mentor.text} />
              <Text style={styles.typingText}>Mentor is typing…</Text>
            </View>
          </View>
        ) : null}

        {sendError ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{sendError}</Text>
            {lastFailedMessage ? (
              <TouchableOpacity onPress={handleResend} style={styles.resendButton}>
                <Text style={styles.resendText}>Resend</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {loadingMore ? (
          <ActivityIndicator color={theme.palette.platinum} />
        ) : nextCursor ? (
          <TouchableOpacity style={styles.loadMore} onPress={handleLoadMore}>
            <Text style={styles.loadMoreText}>Load earlier messages</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerSpacer} />
        )}
      </View>
    );
  }, [
    awaitingReply,
    handleLoadMore,
    handleResend,
    lastFailedMessage,
    loadingMore,
    nextCursor,
    sendError,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={chatTheme.backgroundGradient} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={insets.top + 12}
        >
          <View style={styles.listContainer}>
            {isLoading ? (
              <View style={styles.loader}>
                <ActivityIndicator color={theme.palette.platinum} />
              </View>
            ) : (
              <FlatList
                ref={listRef}
                style={styles.list}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={
                  messages.length === 0
                    ? styles.emptyContent
                    : [styles.listContent, { paddingBottom: 160 + insets.bottom }]
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>Start a new conversation</Text>
                    <Text style={styles.emptySubtitle}>
                      Your mentor will remember the session ID for this chat.
                    </Text>
                  </View>
                }
                ListFooterComponent={footer}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={theme.palette.platinum}
                  />
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          <View style={[styles.inputWrapper, { paddingBottom: theme.spacing.md + insets.bottom }]}>
            <View style={styles.inputBar}>
              <TextInput
                style={[
                  styles.input,
                  {
                    height: Math.max(48, Math.min(inputHeight || 0, 160)),
                  },
                ]}
                placeholder="Ask your SelfLink Mentor…"
                placeholderTextColor={chatTheme.input.placeholder}
                value={input}
                onChangeText={setInput}
                onContentSizeChange={(event) =>
                  setInputHeight(event.nativeEvent.contentSize.height)
                }
                editable={!isSending}
                multiline
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSend}
                disabled={!input.trim() || isSending || awaitingReply}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={theme.palette.pearl} />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={
                      !input.trim() || awaitingReply
                        ? chatTheme.input.placeholder
                        : theme.palette.pearl
                    }
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: chatTheme.background,
  },
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 140,
    paddingTop: theme.spacing.md - 4,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  messageRow: {
    marginVertical: 0,
  },
  messageRowLeft: {
    alignItems: 'flex-start',
  },
  messageRowRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: chatTheme.bubble.maxWidth as `${number}%`,
    paddingHorizontal: chatTheme.spacing.md,
    paddingVertical: chatTheme.spacing.sm,
    borderRadius: chatTheme.bubble.radius,
    gap: 8,
  },
  userBubble: {
    backgroundColor: chatTheme.bubble.user.background,
    borderWidth: 1,
    borderColor: chatTheme.bubble.user.border,
    borderBottomRightRadius: chatTheme.bubble.radius / 2,
    borderTopRightRadius: chatTheme.bubble.radius / 2,
  },
  mentorBubble: {
    backgroundColor: chatTheme.bubble.mentor.background,
    borderBottomLeftRadius: chatTheme.bubble.radius / 2,
    borderTopLeftRadius: chatTheme.bubble.radius / 2,
  },
  mentorShadow: {
    ...(chatTheme.bubble.mentor.shadow || {}),
  },
  userText: {
    color: chatTheme.bubble.user.text,
    ...chatTheme.typography.body,
  },
  mentorText: {
    color: chatTheme.bubble.mentor.text,
    ...chatTheme.typography.body,
  },
  timestamp: {
    color: chatTheme.bubble.user.timestamp,
    ...chatTheme.typography.timestamp,
    marginTop: 4,
    textAlign: 'right',
  },
  timestampUser: {
    color: chatTheme.bubble.user.timestamp,
  },
  timestampMentor: {
    color: chatTheme.bubble.mentor.timestamp,
  },
  sessionLabel: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    marginTop: theme.spacing.sm,
    marginBottom: 2,
  },
  footer: {
    paddingVertical: theme.spacing.sm,
    gap: chatTheme.spacing.sm,
  },
  loadMore: {
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.palette.steel,
  },
  loadMoreText: {
    color: theme.palette.platinum,
    ...theme.typography.caption,
  },
  footerSpacer: {
    height: chatTheme.spacing.md,
  },
  typingRow: {
    marginTop: chatTheme.spacing.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: chatTheme.spacing.sm,
  },
  typingText: {
    color: chatTheme.bubble.mentor.text,
    ...chatTheme.typography.body,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: chatTheme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  errorText: {
    color: theme.palette.ember,
    ...theme.typography.caption,
    flex: 1,
  },
  resendButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.palette.ember,
  },
  resendText: {
    color: theme.palette.ember,
    fontWeight: '700',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    color: theme.palette.platinum,
    ...theme.typography.headingM,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
    textAlign: 'center',
  },
  inputWrapper: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: chatTheme.input.border,
    backgroundColor: chatTheme.input.background,
    gap: theme.spacing.sm,
    borderRadius: 18,
    ...chatTheme.input.shadow,
  },
  input: {
    flex: 1,
    maxHeight: 160,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: chatTheme.input.background,
    color: chatTheme.input.text,
    ...chatTheme.typography.body,
    textAlignVertical: 'top',
  },
  sendButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.radii.full,
    backgroundColor: theme.palette.glow,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
});
