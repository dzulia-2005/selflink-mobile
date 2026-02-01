import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';

export function NatalMentorScreen() {
  const toast = useToast();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const currentUser = useAuthStore((state) => state.currentUser);
  const [mentorText, setMentorText] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(
    'Give me a short natal mentor reading based on my chart.',
  );
  const [loading, setLoading] = useState(true);
  const pendingPromptRef = useRef<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

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
    reset,
  } = useMentorStream({
    mode: 'natal_mentor',
    language: userLanguage || undefined,
  });

  const startNatalStream = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || isStreaming) {
        return;
      }
      pendingPromptRef.current = trimmed;
      setHasStarted(true);
      setLoading(true);
      reset();
      startStream(trimmed);
    },
    [isStreaming, reset, startStream],
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const cached = await AsyncStorage.getItem('natal-mentor');
        if (cached) {
          const parsed = JSON.parse(cached) as { mentor_text?: string };
          if (parsed.mentor_text) {
            setMentorText(parsed.mentor_text);
          }
        }
      } catch (error) {
        console.warn('Natal mentor cache read failed', error);
      }
      setLoading(false);
    };
    bootstrap().catch(() => undefined);
  }, []);

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
      setLoading(false);
      pendingPromptRef.current = null;
    }
  }, [streamError, toast]);

  useEffect(() => {
    if (!isStreaming && pendingPromptRef.current && !streamError) {
      // Cache the latest successful response
      if (replyText) {
        AsyncStorage.setItem(
          'natal-mentor',
          JSON.stringify({ mentor_text: replyText }),
        ).catch(() => undefined);
      }
      pendingPromptRef.current = null;
      setLoading(false);
    } else if (!isStreaming && hasStarted) {
      setLoading(false);
    }
  }, [hasStarted, isStreaming, replyText, streamError]);

  const handleSend = useCallback(() => {
    startNatalStream(prompt);
  }, [prompt, startNatalStream]);

  if (loading && !mentorText) {
    return <LoadingView message="Calling your natal mentor…" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <Text style={styles.headline}>Natal Mentor</Text>
      <Text style={styles.subtitle}>
        Deep explanation of your personality, emotions, and life themes.
      </Text>

      <MetalPanel>
        {mentorText ? (
          <Text style={styles.body}>{mentorText}</Text>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.subtitle}>No reading yet. Try again.</Text>
            <MetalButton title="Retry" onPress={handleSend} />
          </View>
        )}
        {isStreaming ? (
          <View style={styles.streamingRow}>
            <ActivityIndicator size="small" color={theme.palette.platinum} />
            <Text style={styles.subtitle}>Natal Mentor is typing…</Text>
          </View>
        ) : null}
      </MetalPanel>

      <MetalPanel>
        <Text style={styles.fieldLabel}>Ask about your natal chart</Text>
        <TextInput
          style={styles.input}
          placeholder="Ask about strengths, challenges, or themes in your chart"
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
            <Text style={styles.submitText}>Ask Natal Mentor</Text>
          )}
        </TouchableOpacity>
      </MetalPanel>
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
      minHeight: 120,
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
      backgroundColor: theme.palette.rose,
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
    body: {
      color: theme.palette.platinum,
      ...theme.typography.body,
    },
    centered: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
  });
