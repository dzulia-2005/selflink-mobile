import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { LoadingView } from '@components/StateViews';
import { useToast } from '@context/ToastContext';
import { fetchDailyMentor } from '@services/api/mentor';
import { theme } from '@theme/index';

export function DailyMentorScreen() {
  const toast = useToast();
  const [messages, setMessages] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem('daily-mentor');
        if (cached) {
          const parsed = JSON.parse(cached) as { date?: string; messages?: string[] };
          if (parsed.date === todayKey && parsed.messages) {
            setMessages(parsed.messages);
            setDate(parsed.date);
            setLoading(false);
            return;
          }
        }
      }
      const result = await fetchDailyMentor();
      setMessages(result.messages || []);
      setDate(result.date);
      await AsyncStorage.setItem(
        'daily-mentor',
        JSON.stringify({ date: result.date, messages: result.messages }),
      );
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
    await load(true);
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingView message="Fetching today’s guidance…" />;
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
            <MetalButton title="Refresh" onPress={() => load(true)} />
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
