import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@context/ToastContext';
import { useMentorStream } from '@hooks/useMentorStream';
import { MentorStackParamList } from '@navigation/types';
import {
  fetchDailyMentorHistory,
  type DailyMentorHistoryItem,
} from '@services/api/mentor';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';

const todayString = () => new Date().toISOString().slice(0, 10);
const BULLET_GLYPH = '\u2022';
const makePreview = (value: string) => {
  if (!value) {
    return '';
  }
  return value.length > 100 ? `${value.slice(0, 100).trim()}…` : value;
};

type DailyMentorReply = {
  session_id: number | null;
  date: string;
  reply: string;
  entry?: string;
};

export function DailyMentorScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation =
    useNavigation<NativeStackNavigationProp<MentorStackParamList, 'DailyMentor'>>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const insets = useSafeAreaInsets();

  const [entry, setEntry] = useState('');
  const [entryDate, setEntryDate] = useState(todayString());
  const [submitting, setSubmitting] = useState(false);
  const [latestReply, setLatestReply] = useState<DailyMentorReply | null>(null);
  const [history, setHistory] = useState<DailyMentorHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const historyRequestRef = useRef(false);
  const committedReplyRef = useRef<string | null>(null);
  const pendingEntryRef = useRef<string | null>(null);

  const userLanguage = useMemo(
    () =>
      currentUser?.settings?.language ||
      (currentUser?.locale ? currentUser.locale.split('-')[0] : undefined),
    [currentUser?.locale, currentUser?.settings?.language],
  );

  const {
    isStreaming,
    error: streamError,
    replyText,
    sessionId: streamingSessionId,
    startStream,
    reset: resetStream,
  } = useMentorStream({ mode: 'daily_mentor', language: userLanguage || undefined });

  const loadHistory = useCallback(async () => {
    if (historyRequestRef.current) {
      return;
    }
    try {
      historyRequestRef.current = true;
      setHistoryLoading(true);
      const response = await fetchDailyMentorHistory(7);
      const items = Array.isArray(response)
        ? response
        : Array.isArray(response.results)
          ? response.results
          : [];
      setHistory(items);
    } catch (error) {
      console.error('DailyMentorScreen: failed to load history', error);
      toast.push({ message: t('mentor.daily.alerts.loadHistoryFailed'), tone: 'error' });
    } finally {
      historyRequestRef.current = false;
      setHistoryLoading(false);
      setRefreshing(false);
    }
  }, [t, toast]);

  useEffect(() => {
    loadHistory().catch(() => undefined);
  }, [loadHistory]);

  const handleSubmit = useCallback(async () => {
    const trimmed = entry.trim();
    if (!trimmed || submitting || isStreaming) {
      return;
    }
    setSubmitting(true);
    pendingEntryRef.current = trimmed;
    committedReplyRef.current = null;
    setLatestReply({
      session_id: streamingSessionId,
      date: entryDate,
      reply: '',
      entry: trimmed,
    });
    setEntry('');
    resetStream();
    startStream(trimmed);
  }, [
    entry,
    entryDate,
    isStreaming,
    resetStream,
    startStream,
    streamingSessionId,
    submitting,
  ]);

  useEffect(() => {
    if (!pendingEntryRef.current) {
      return;
    }
    setLatestReply((current) =>
      current
        ? {
            ...current,
            reply: replyText,
            session_id: streamingSessionId ?? current.session_id,
          }
        : {
            session_id: streamingSessionId ?? null,
            date: entryDate,
            reply: replyText,
            entry: pendingEntryRef.current ?? undefined,
          },
    );
  }, [entryDate, replyText, streamingSessionId]);

  useEffect(() => {
    if (!isStreaming && pendingEntryRef.current && !streamError) {
      const currentReply = replyText || '';
      if (!currentReply) {
        setSubmitting(false);
        pendingEntryRef.current = null;
        return;
      }
      if (committedReplyRef.current === currentReply) {
        return;
      }
      committedReplyRef.current = currentReply;
      const session_id = streamingSessionId ?? Date.now();
      const entryPreview = makePreview(pendingEntryRef.current);
      const replyPreview = makePreview(replyText);
      const historyItem: DailyMentorHistoryItem = {
        session_id,
        date: entryDate,
        entry_preview: entryPreview,
        reply_preview: replyPreview,
      };
      setHistory((current) => {
        const filtered = current.filter((item) => item.session_id !== session_id);
        return [historyItem, ...filtered].slice(0, 7);
      });
      setLatestReply((current) =>
        current
          ? { ...current, session_id, reply: replyText }
          : {
              session_id,
              date: entryDate,
              reply: replyText,
              entry: pendingEntryRef.current ?? undefined,
            },
      );
      setSubmitting(false);
      pendingEntryRef.current = null;
    }
  }, [entryDate, isStreaming, replyText, streamError, streamingSessionId]);

  useEffect(() => {
    if (!streamError) {
      return;
    }
    const failed = pendingEntryRef.current;
    if (failed) {
      setEntry(failed);
    }
    pendingEntryRef.current = null;
    committedReplyRef.current = null;
    setSubmitting(false);
    setLatestReply(null);
    toast.push({
      message: streamError || t('mentor.daily.alerts.streamUnavailable'),
      tone: 'error',
    });
  }, [streamError, t, toast]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory().catch(() => undefined);
  }, [loadHistory]);

  const openSession = useCallback(
    (sessionId: number) => navigation.navigate('DailyMentorEntry', { sessionId }),
    [navigation],
  );

  const renderHistoryItem = useCallback(
    ({ item }: { item: DailyMentorHistoryItem }) => (
      <TouchableOpacity
        key={item.session_id}
        style={styles.historyItem}
        onPress={() => openSession(item.session_id)}
      >
        <View style={styles.historyTopRow}>
          <Text style={styles.historyDate}>{item.date}</Text>
          <Text style={styles.historySession}>
            {t('mentor.daily.sessionTag', { id: item.session_id })}
          </Text>
        </View>
        <Text style={styles.historyPreview} numberOfLines={2}>
          {item.entry_preview}
        </Text>
        <Text style={styles.historyReply} numberOfLines={2}>
          {item.reply_preview}
        </Text>
      </TouchableOpacity>
    ),
    [
      openSession,
      styles.historyDate,
      styles.historyItem,
      styles.historyPreview,
      styles.historyReply,
      styles.historySession,
      styles.historyTopRow,
      t,
    ],
  );

  const Separator = useCallback(
    () => <View style={{ height: theme.spacing.sm }} />,
    [theme.spacing.sm],
  );

  const hasHistory = history.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={insets.top + 12}
      >
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.session_id)}
          renderItem={renderHistoryItem}
          ListHeaderComponent={
            <DailyMentorHeader
              entry={entry}
              entryDate={entryDate}
              isStreaming={isStreaming}
              submitting={submitting}
              latestReply={latestReply}
              onChangeEntry={setEntry}
              onChangeEntryDate={setEntryDate}
              onSubmit={handleSubmit}
              onRefresh={onRefresh}
              historyLoading={historyLoading}
              hasHistory={hasHistory}
              t={t}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: theme.spacing.xl + insets.bottom },
          ]}
          ItemSeparatorComponent={Separator}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListFooterComponent={
            historyLoading && history.length === 0 ? null : (
              <View style={{ height: theme.spacing.md }} />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type HeaderProps = {
  entry: string;
  entryDate: string;
  isStreaming: boolean;
  submitting: boolean;
  latestReply: DailyMentorReply | null;
  onChangeEntry: (value: string) => void;
  onChangeEntryDate: (value: string) => void;
  onSubmit: () => void;
  onRefresh: () => void;
  historyLoading: boolean;
  hasHistory: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
};

function DailyMentorHeader({
  entry,
  entryDate,
  isStreaming,
  submitting,
  latestReply,
  onChangeEntry,
  onChangeEntryDate,
  onSubmit,
  onRefresh,
  historyLoading,
  hasHistory,
  t,
}: HeaderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.content}>
      <View style={styles.headerBlock}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{t('mentor.daily.badge')}</Text>
        </View>
        <Text style={styles.title}>{t('mentor.daily.title')}</Text>
        <Text style={styles.subtitle}>{t('mentor.daily.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('mentor.daily.entrySectionTitle')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('mentor.daily.entryPlaceholder')}
          placeholderTextColor={theme.palette.silver}
          multiline
          scrollEnabled
          value={entry}
          onChangeText={onChangeEntry}
          textAlignVertical="top"
          accessibilityLabel={t('mentor.daily.accessibility.entryInput')}
        />

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>{t('mentor.daily.entryDate')}</Text>
            <TextInput
              style={styles.dateInput}
              value={entryDate}
              onChangeText={onChangeEntryDate}
              placeholder={t('mentor.daily.entryDatePlaceholder')}
              placeholderTextColor={theme.palette.silver}
              accessibilityLabel={t('mentor.daily.accessibility.entryDateInput')}
            />
          </View>
          <TouchableOpacity
            onPress={() => onChangeEntryDate(todayString())}
            style={styles.todayButton}
            accessibilityRole="button"
            accessibilityLabel={t('mentor.daily.accessibility.todayButton')}
          >
            <Text style={styles.todayText}>{t('mentor.daily.today')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            !entry.trim() || submitting || isStreaming
              ? styles.submitButtonDisabled
              : null,
          ]}
          onPress={onSubmit}
          disabled={!entry.trim() || submitting || isStreaming}
        >
          {submitting || isStreaming ? (
            <ActivityIndicator color={theme.palette.pearl} />
          ) : (
            <Text style={styles.submitText}>{t('mentor.daily.getReflection')}</Text>
          )}
        </TouchableOpacity>

        {isStreaming ? (
          <View style={styles.streamingRow}>
            <ActivityIndicator color={theme.palette.pearl} size="small" />
            <Text style={styles.streamingText}>{t('mentor.daily.replying')}</Text>
          </View>
        ) : null}

        {latestReply ? (
          <View style={styles.replyBlock}>
            <View style={styles.replyHeader}>
              <Text style={styles.replyTitle}>{t('mentor.daily.replyTitle')}</Text>
              <Text style={styles.sessionTag}>
                {t('mentor.daily.sessionTag', { id: latestReply.session_id })}
              </Text>
            </View>
            {latestReply.reply
              .split('\n')
              .filter(Boolean)
              .map((line, idx) => (
                <View
                  style={styles.bulletRow}
                  key={`${latestReply.session_id}-line-${idx}`}
                >
                  <Text style={styles.bullet}>{BULLET_GLYPH}</Text>
                  <Text style={styles.bulletText}>{line.trim()}</Text>
                </View>
              ))}
          </View>
        ) : null}
      </View>

      <View style={styles.historyHeaderRow}>
        <Text style={styles.sectionLabel}>{t('mentor.daily.recentEntries')}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.refreshText}>{t('mentor.daily.refresh')}</Text>
        </TouchableOpacity>
      </View>
      {historyLoading ? (
        <View style={[styles.historyPlaceholder, styles.centered]}>
          <ActivityIndicator color={theme.palette.platinum} />
        </View>
      ) : !hasHistory ? (
        <View style={styles.historyPlaceholder}>
          <Text style={styles.subtitle}>{t('mentor.daily.noEntries')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.palette.midnight,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    listContent: {
      paddingTop: 0,
    },
    headerBlock: {
      gap: theme.spacing.sm,
    },
    pill: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(244, 114, 182, 0.12)',
      borderColor: 'rgba(244, 114, 182, 0.4)',
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radii.pill,
    },
    pillText: {
      color: theme.palette.rose,
      fontWeight: '700',
      fontSize: 12,
    },
    title: {
      color: theme.palette.platinum,
      ...theme.typography.headingL,
    },
    subtitle: {
      color: theme.palette.silver,
      ...theme.typography.body,
    },
    card: {
      backgroundColor: theme.palette.charcoal,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(244, 114, 182, 0.18)',
    },
    sectionLabel: {
      color: theme.palette.platinum,
      ...theme.typography.headingM,
    },
    input: {
      minHeight: 140,
      maxHeight: 200,
      borderRadius: theme.radii.md,
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.palette.titanium,
      padding: theme.spacing.md,
      color: theme.palette.platinum,
      ...theme.typography.body,
    },
    dateRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      alignItems: 'flex-end',
    },
    dateField: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    fieldLabel: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    dateInput: {
      borderRadius: theme.radii.md,
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.palette.titanium,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      color: theme.palette.platinum,
      ...theme.typography.body,
    },
    todayButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radii.pill,
      backgroundColor: 'rgba(244, 114, 182, 0.16)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(244, 114, 182, 0.4)',
    },
    todayText: {
      color: theme.palette.rose,
      fontWeight: '600',
    },
    submitButton: {
      backgroundColor: theme.palette.rose,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitText: {
      color: theme.palette.pearl,
      fontWeight: '700',
      fontSize: 16,
    },
    replyBlock: {
      gap: theme.spacing.sm,
      backgroundColor: 'rgba(244, 114, 182, 0.08)',
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(244, 114, 182, 0.4)',
    },
    replyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    replyTitle: {
      color: theme.palette.platinum,
      ...theme.typography.subtitle,
      flex: 1,
    },
    streamingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    streamingText: {
      color: theme.palette.platinum,
      ...theme.typography.caption,
    },
    sessionTag: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    bulletRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      alignItems: 'flex-start',
    },
    bullet: {
      color: theme.palette.rose,
      fontSize: 16,
      lineHeight: 22,
      marginTop: 2,
    },
    bulletText: {
      color: theme.palette.platinum,
      ...theme.typography.body,
      flex: 1,
    },
    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    historyHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      marginTop: -theme.spacing.sm,
    },
    historyPlaceholder: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    refreshText: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    historyList: {
      gap: theme.spacing.sm,
    },
    historyItem: {
      padding: theme.spacing.md,
      borderRadius: theme.radii.md,
      backgroundColor: 'rgba(148, 163, 184, 0.08)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(148, 163, 184, 0.2)',
      gap: theme.spacing.xs,
    },
    historyTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    historyDate: {
      color: theme.palette.platinum,
      fontWeight: '700',
    },
    historySession: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    historyPreview: {
      color: theme.palette.platinum,
      ...theme.typography.body,
    },
    historyReply: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
    },
  });
