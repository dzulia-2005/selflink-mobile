import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { LoadingView } from '@components/StateViews';
import { useToast } from '@context/ToastContext';
import { useMentorStream } from '@hooks/useMentorStream';
import { SoulMatchStackParamList } from '@navigation/types';
import { fetchSoulmatchMentor } from '@services/api/mentor';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';
import { normalizeApiError } from '@utils/apiErrors';

type Route = RouteProp<SoulMatchStackParamList, 'SoulMatchMentor'>;
type Nav = NativeStackNavigationProp<SoulMatchStackParamList>;

export function SoulMatchMentorScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { userId, displayName } = route.params;
  const toast = useToast();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const [mentorText, setMentorText] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prompt, setPrompt] = useState(
    displayName
      ? t('soulmatch.mentor.defaultPromptWithName', { name: displayName })
      : t('soulmatch.mentor.defaultPrompt'),
  );
  const pendingPromptRef = useRef<string | null>(null);

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
    startStream,
    reset: resetStream,
  } = useMentorStream({
    mode: 'soulmatch_mentor',
    language: userLanguage || undefined,
  });

  const startSoulMatchStream = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || isStreaming) {
        return;
      }
      pendingPromptRef.current = trimmed;
      resetStream();
      startStream(trimmed);
    },
    [isStreaming, resetStream, startStream],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('SoulMatch: mentor fetch start', { userId });
      }
      const result = await fetchSoulmatchMentor(userId);
      setMentorText(result.mentor_text);
      setScore(result.score);
      setTags(result.tags || []);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('SoulMatch: mentor fetch ok', { userId });
      }
    } catch (error) {
      const normalized = normalizeApiError(
        error,
        t('soulmatch.mentor.alerts.loadFailed'),
      );
      if (normalized.status === 401 || normalized.status === 403) {
        toast.push({ message: normalized.message, tone: 'error' });
        logout();
        return;
      }
      toast.push({ message: normalized.message, tone: 'error' });
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('SoulMatch: mentor fetch error', normalized);
      }
    } finally {
      setLoading(false);
    }
  }, [logout, t, toast, userId]);

  useEffect(() => {
    navigation.setOptions?.({
      title: displayName || t('soulmatch.mentor.title'),
    });
    load().catch(() => undefined);
  }, [displayName, load, navigation, t]);

  useEffect(() => {
    if (replyText) {
      setMentorText(replyText);
    }
  }, [replyText]);

  useEffect(() => {
    if (streamError) {
      if (pendingPromptRef.current) {
        setPrompt(pendingPromptRef.current);
      }
      toast.push({ message: streamError, tone: 'error' });
      pendingPromptRef.current = null;
    }
  }, [streamError, toast]);

  useEffect(() => {
    if (!isStreaming && pendingPromptRef.current && !streamError) {
      pendingPromptRef.current = null;
    }
  }, [isStreaming, streamError]);

  const handleSend = useCallback(() => {
    const base = prompt.trim();
    if (!base) {
      return;
    }
    const contextual = displayName
      ? `${base}\n\nContext: This question is about ${displayName} (user ${userId}).`
      : base;
    startSoulMatchStream(contextual);
  }, [displayName, prompt, startSoulMatchStream, userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingView message={t('soulmatch.mentor.loading')} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      <Text style={styles.headline}>{t('soulmatch.mentor.title')}</Text>
      <Text style={styles.subtitle}>
        {displayName
          ? t('soulmatch.mentor.subtitleWithName', { name: displayName })
          : t('soulmatch.mentor.subtitleWithUserId', { userId })}
      </Text>

      <MetalPanel glow>
        {score !== null ? (
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreLabel}>{t('soulmatch.mentor.scoreLabel')}</Text>
          </View>
        ) : null}
        <View style={styles.tagRow}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </MetalPanel>

      <MetalPanel>
        {mentorText ? (
          <Text style={styles.body}>{mentorText}</Text>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.subtitle}>{t('soulmatch.mentor.empty')}</Text>
            <MetalButton title={t('soulmatch.mentor.actions.refresh')} onPress={load} />
          </View>
        )}
        {isStreaming ? (
          <View style={styles.streamingRow}>
            <ActivityIndicator size="small" color={theme.palette.platinum} />
            <Text style={styles.subtitle}>{t('soulmatch.mentor.streaming')}</Text>
          </View>
        ) : null}
      </MetalPanel>

      <MetalPanel>
        <Text style={styles.fieldLabel}>{t('soulmatch.mentor.askLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('soulmatch.mentor.askPlaceholder')}
          placeholderTextColor={theme.palette.silver}
          multiline
          value={prompt}
          onChangeText={setPrompt}
        />
        <TouchableOpacity
          style={[
            styles.submitButton,
            !prompt.trim() || isStreaming ? styles.submitButtonDisabled : null,
          ]}
          onPress={handleSend}
          disabled={!prompt.trim() || isStreaming}
        >
          {isStreaming ? (
            <ActivityIndicator color={theme.palette.pearl} />
          ) : (
            <Text style={styles.submitText}>{t('soulmatch.mentor.askButton')}</Text>
          )}
        </TouchableOpacity>
      </MetalPanel>

      <MetalButton title={t('common.back')} onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.palette.midnight,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    headline: {
      color: theme.palette.platinum,
      ...theme.typography.headingL,
    },
    subtitle: {
      color: theme.palette.silver,
      ...theme.typography.body,
    },
    fieldLabel: {
      color: theme.palette.platinum,
      ...theme.typography.subtitle,
      marginBottom: theme.spacing.sm,
    },
    input: {
      minHeight: 100,
      maxHeight: 200,
      borderRadius: theme.radii.md,
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.palette.titanium,
      padding: theme.spacing.md,
      color: theme.palette.platinum,
      ...theme.typography.body,
      marginBottom: theme.spacing.md,
    },
    submitButton: {
      backgroundColor: theme.palette.glow,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitText: {
      color: theme.palette.pearl,
      fontWeight: '700',
      fontSize: 16,
    },
    streamingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    scoreBlock: {
      alignItems: 'flex-start',
      gap: theme.spacing.xs,
    },
    scoreValue: {
      color: theme.palette.platinum,
      fontSize: 32,
      fontWeight: '800',
    },
    scoreLabel: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    tag: {
      backgroundColor: theme.palette.titanium,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radii.pill,
    },
    tagText: {
      color: theme.palette.pearl,
      fontSize: 12,
      fontWeight: '600',
    },
    body: {
      color: theme.palette.platinum,
      ...theme.typography.body,
    },
    centered: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
  });
