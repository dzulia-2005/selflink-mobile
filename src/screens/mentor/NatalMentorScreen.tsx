import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LoadingOverlay } from '@components/LoadingOverlay';
import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import { fetchNatalMentor } from '@services/api/mentor';
import { theme } from '@theme/index';

export function NatalMentorScreen() {
  const toast = useToast();
  const [mentorText, setMentorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchNatalMentor();
      setMentorText(result.mentor_text);
    } catch (error) {
      console.error('Natal mentor failed', error);
      toast.push({ message: 'Unable to load natal mentor.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  if (loading) {
    return <LoadingOverlay label="Calling your natal mentor…" />;
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
            <MetalButton title="Retry" onPress={load} />
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
  body: {
    color: theme.palette.platinum,
    ...theme.typography.body,
  },
  centered: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});
