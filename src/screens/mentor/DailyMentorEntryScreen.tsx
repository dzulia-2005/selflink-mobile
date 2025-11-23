import { RouteProp, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@context/ToastContext';
import { fetchDailyMentorSession, type DailyMentorSession } from '@services/api/mentor';
import { MentorStackParamList } from '@navigation/types';
import { theme } from '@theme/index';

type RouteProps = RouteProp<MentorStackParamList, 'DailyMentorEntry'>;

export function DailyMentorEntryScreen() {
  const { params } = useRoute<RouteProps>();
  const toast = useToast();

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>{session.date}</Text>
          <Text style={styles.subtitle}>Session #{session.session_id}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Your note</Text>
        <Text style={styles.body}>{session.entry}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Mentor&apos;s reply</Text>
        {session.reply
          .split('\n')
          .filter(Boolean)
          .map((line, idx) => (
            <View style={styles.bulletRow} key={`${session.session_id}-detail-${idx}`}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.body}>{line.trim()}</Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0A14',
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
    backgroundColor: '#131024',
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
