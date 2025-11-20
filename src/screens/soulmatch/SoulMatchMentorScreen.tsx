import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { LoadingView } from '@components/StateViews';
import { useToast } from '@context/ToastContext';
import { SoulMatchStackParamList } from '@navigation/types';
import { fetchSoulmatchMentor } from '@services/api/mentor';
import { theme } from '@theme/index';

type Route = RouteProp<SoulMatchStackParamList, 'SoulMatchMentor'>;
type Nav = NativeStackNavigationProp<SoulMatchStackParamList>;

export function SoulMatchMentorScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { userId, displayName } = route.params;
  const toast = useToast();
  const [mentorText, setMentorText] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchSoulmatchMentor(userId);
      setMentorText(result.mentor_text);
      setScore(result.score);
      setTags(result.tags || []);
    } catch (error) {
      console.error('SoulMatch mentor load failed', error);
      toast.push({ message: 'Unable to load mentor guidance.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    navigation.setOptions?.({ title: displayName || 'SoulMatch Mentor' });
    load().catch(() => undefined);
  }, [displayName, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingView message="Opening SoulMatch mentor…" />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      <Text style={styles.headline}>SoulMatch Mentor</Text>
      <Text style={styles.subtitle}>
        Guidance about your connection with {displayName || `user ${userId}`}.
      </Text>

      <MetalPanel glow>
        {score !== null ? (
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreLabel}>compatibility</Text>
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
            <Text style={styles.subtitle}>No mentor text yet.</Text>
            <MetalButton title="Refresh" onPress={load} />
          </View>
        )}
      </MetalPanel>

      <MetalButton title="Back" onPress={() => navigation.goBack()} />
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
