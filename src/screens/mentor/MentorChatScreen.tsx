import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '@context/ToastContext';
import {
  fetchMentorHistory,
  sendMentorChat,
  type MentorHistoryMessage,
} from '@services/api/mentorSessions';
import { useAuthStore } from '@store/authStore';
import { theme } from '@theme/index';

type ChatMessage = Omit<MentorHistoryMessage, 'id'> & { id: string };

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
  const currentUser = useAuthStore((state) => state.currentUser);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [shouldScrollToEnd, setShouldScrollToEnd] = useState(false);
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

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
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
      setShouldScrollToEnd(false);
    }
  }, [messages.length, shouldScrollToEnd]);

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

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
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
    setIsSending(true);
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
      toast.push({ message: 'Unable to send message to your mentor.', tone: 'error' });
      setMessages((current) => current.filter((msg) => msg.id !== optimisticUser.id));
      setInput(trimmed);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, toast]);

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const previous = messages[index - 1];
      const showSessionDivider = !previous || previous.session_id !== item.session_id;
      const isUser = item.role === 'user';
      const sessionLabel =
        item.session_id && item.session_id > 0
          ? `Session #${item.session_id}`
          : 'New session';
      return (
        <View>
          {showSessionDivider ? (
            <Text style={styles.sessionLabel}>{sessionLabel}</Text>
          ) : null}
          <View
            style={[
              styles.messageRow,
              isUser ? styles.messageRowRight : styles.messageRowLeft,
            ]}
          >
            <View
              style={[
                styles.bubble,
                isUser ? styles.userBubble : styles.mentorBubble,
                item.role === 'mentor' ? styles.mentorShadow : null,
              ]}
            >
              <Text style={isUser ? styles.userText : styles.mentorText}>{item.content}</Text>
              <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
            </View>
          </View>
        </View>
      );
    },
    [messages],
  );

  const footer = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={theme.palette.platinum} />
        </View>
      );
    }
    if (!nextCursor) {
      return <View style={styles.footer} />;
    }
    return (
      <TouchableOpacity style={styles.loadMore} onPress={handleLoadMore}>
        <Text style={styles.loadMoreText}>Load earlier messages</Text>
      </TouchableOpacity>
    );
  }, [handleLoadMore, loadingMore, nextCursor]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={12}
      >
        <View style={styles.header}>
          <Text style={styles.title}>AI Mentor</Text>
          <Text style={styles.subtitle}>
            Share anything on your mind. Sessions stay grouped, and the mentor replies even
            when the LLM is warming up.
          </Text>
        </View>

        <View style={styles.listContainer}>
          {isLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={theme.palette.platinum} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={
                messages.length === 0 ? styles.emptyContent : styles.listContent
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

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Tell your mentor what you feel…"
            placeholderTextColor={theme.palette.silver}
            value={input}
            onChangeText={setInput}
            editable={!isSending}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!input.trim() || isSending}
          >
            <Ionicons
              name="send"
              size={20}
              color={!input.trim() || isSending ? theme.palette.silver : theme.palette.lime}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.palette.platinum,
    ...theme.typography.headingL,
  },
  subtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  listContainer: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  messageRow: {
    marginVertical: 2,
  },
  messageRowLeft: {
    alignItems: 'flex-start',
  },
  messageRowRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
  },
  userBubble: {
    backgroundColor: theme.palette.azure + '22',
    borderWidth: 1,
    borderColor: theme.palette.azure + '55',
    borderBottomRightRadius: theme.radii.sm,
  },
  mentorBubble: {
    backgroundColor: theme.palette.obsidian,
    borderBottomLeftRadius: theme.radii.sm,
  },
  mentorShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  userText: {
    color: theme.palette.platinum,
    ...theme.typography.body,
  },
  mentorText: {
    color: theme.palette.pearl,
    ...theme.typography.body,
  },
  timestamp: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    marginTop: 4,
    textAlign: 'right',
  },
  sessionLabel: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    marginTop: theme.spacing.sm,
    marginBottom: 2,
  },
  footer: {
    paddingVertical: theme.spacing.sm,
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.palette.titanium,
    backgroundColor: theme.palette.charcoal,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    maxHeight: 140,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.palette.obsidian,
    color: theme.palette.platinum,
    ...theme.typography.body,
    textAlignVertical: 'top',
  },
  sendButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.radii.full,
    backgroundColor: theme.palette.obsidian,
  },
});
