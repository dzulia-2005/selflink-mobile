import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoadingOverlay } from '@components/LoadingOverlay';
import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import { fetchDailyMentor } from '@services/api/mentor';
import { theme } from '@theme/index';

export function DailyMentorScreen() {
  const toast = useToast();
  const [messages, setMessages] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchDailyMentor();
      setMessages(result.messages || []);
      setDate(result.date);
    } catch (error) {
      console.error('Daily mentor failed', error);
      toast.push({ message: 'Unable to load daily guidance.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingOverlay label="Fetching today’s guidance…" />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      <Text style={styles.headline}>Daily Mentor</Text>
      <Text style={styles.subtitle}>{date ? `Guidance for ${date}` : 'Today'}</Text>

      <MetalPanel>
        {messages.length > 0 ? (
          <View style={styles.list}>
            {messages.map((msg, idx) => (
              <Text key={idx} style={styles.message}>
                {idx + 1}. {msg}
              </Text>
            ))}
          </View>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.subtitle}>No messages available.</Text>
            <MetalButton title="Refresh" onPress={load} />
          </View>
        )}
      </MetalPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  list: {
    gap: theme.spacing.sm,
  },
  message: {
    color: theme.palette.platinum,
    ...theme.typography.body,
  },
  centered: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});
