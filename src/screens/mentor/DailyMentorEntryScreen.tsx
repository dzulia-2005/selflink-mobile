import { RouteProp, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@context/ToastContext';
import { MentorStackParamList } from '@navigation/types';
import { fetchDailyMentorSession, type DailyMentorSession } from '@services/api/mentor';
import { useTheme, type Theme } from '@theme';

type RouteProps = RouteProp<MentorStackParamList, 'DailyMentorEntry'>;

export function DailyMentorEntryScreen() {
  const { params } = useRoute<RouteProps>();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [session, setSession] = useState<DailyMentorSession | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchDailyMentorSession(params.sessionId);
      setSession(response);
    } catch (error) {
      console.error('DailyMentorEntryScreen: failed to load session', error);
      toast.push({ message: 'Unable to load this entry.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [params.sessionId, toast]);

  useEffect(() => {
    loadSession().catch(() => undefined);
  }, [loadSession]);

  const content = () => {
    if (loading) {
      return (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator color={theme.palette.platinum} />
        </View>
      );
    }

    if (!session) {
      return (
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.subtitle}>Entry not found.</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.spacing.xl + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.title}>{session.date}</Text>
            <Text style={styles.subtitle}>Session #{session.session_id}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Your note</Text>
          <Text style={styles.body}>{session.entry ?? 'No entry text available.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Mentor&apos;s reply</Text>
          {(typeof session.reply === 'string'
            ? session.reply.split(/\r?\n/).filter(Boolean)
            : []
          ).map((line, idx) => (
            <View style={styles.bulletRow} key={`${session.session_id}-detail-${idx}`}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.body}>{line.trim()}</Text>
            </View>
          ))}
          {!session.reply ? (
            <Text style={styles.body}>Reply not available yet.</Text>
          ) : null}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={insets.top + 12}
      >
        {content()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: theme.palette.midnight,
    },
    container: {
      flex: 1,
      backgroundColor: theme.palette.midnight,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      gap: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(244, 114, 182, 0.18)',
    },
    sectionLabel: {
      color: theme.palette.platinum,
      ...theme.typography.headingM,
    },
    body: {
      color: theme.palette.platinum,
      ...theme.typography.body,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    bullet: {
      color: theme.palette.rose,
      fontSize: 16,
      lineHeight: 22,
      marginTop: 2,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
