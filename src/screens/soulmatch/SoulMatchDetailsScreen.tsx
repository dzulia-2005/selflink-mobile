import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { LoadingView } from '@components/StateViews';
import { useToast } from '@context/ToastContext';
import { SoulMatchStackParamList } from '@navigation/types';
import { fetchSoulmatchMentor, fetchSoulmatchWith } from '@services/api/soulmatch';
import { SoulmatchResult } from '@schemas/soulmatch';
import { theme } from '@theme/index';

type Route = RouteProp<SoulMatchStackParamList, 'SoulMatchDetail'>;
type Nav = NativeStackNavigationProp<SoulMatchStackParamList>;

export function SoulMatchDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { userId, displayName } = route.params;
  const toast = useToast();
  const [data, setData] = useState<SoulmatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [mentorText, setMentorText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const title = useMemo(() => displayName || 'SoulMatch', [displayName]);

  const load = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchSoulmatchWith(userId);
      setData(result);
    } catch (error) {
      console.error('Soulmatch details failed', error);
      toast.push({ message: 'Unable to load match details.', tone: 'error', duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    navigation.setOptions?.({ title });
    load().catch(() => undefined);
  }, [navigation, title]);

  const loadMentor = async () => {
    if (!userId) return;
    try {
      const result = await fetchSoulmatchMentor(userId);
      setMentorText(result.mentor_text ?? '');
      setData((prev: SoulmatchResult | null) =>
        prev
          ? { ...prev, tags: result.tags ?? prev.tags, components: result.components ?? prev.components }
          : result,
      );
    } catch (error) {
      console.error('Soulmatch mentor failed', error);
      toast.push({ message: 'Mentor is unavailable. Try again later.', tone: 'error' });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingView message="Loading SoulMatch…" />;
  }

  if (!data) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Unable to load match.</Text>
        <MetalButton title="Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const components = data.components || { astro: 0, matrix: 0, psychology: 0, lifestyle: 0 };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      <Text style={styles.headline}>{title}</Text>
      <Text style={styles.subtitle}>Compatibility breakdown and mentor insight.</Text>

      <MetalPanel glow>
        <Text style={styles.scoreValue}>{data.score}</Text>
        <Text style={styles.scoreLabel}>compatibility</Text>
        <View style={styles.components}>
          {Object.entries(components).map(([key, value]) => (
            <View key={key} style={styles.componentRow}>
              <Text style={styles.componentLabel}>{key}</Text>
              <View style={styles.barBackground}>
                <View style={[styles.barFill, { width: `${Math.min(value, 100)}%` }]} />
              </View>
              <Text style={styles.componentValue}>{value}</Text>
            </View>
          ))}
        </View>
        <View style={styles.tagRow}>
          {data.tags?.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </MetalPanel>

      <MetalPanel>
        <Text style={styles.sectionTitle}>Mentor insight</Text>
        {mentorText ? (
          <Text style={styles.mentorText}>{mentorText}</Text>
        ) : (
          <MetalButton title="Load Mentor Insight" onPress={loadMentor} />
        )}
        <MetalButton
          title="Open Mentor Screen"
          onPress={() =>
            navigation.navigate('SoulMatchMentor', {
              userId: data.user?.id ?? data.user_id ?? userId,
              displayName: displayName || data.user?.name || data.user?.handle,
            })
          }
        />
      </MetalPanel>

      <MetalButton title="Back to recommendations" onPress={() => navigation.goBack()} />
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
  scoreValue: {
    color: theme.palette.platinum,
    fontSize: 32,
    fontWeight: '800',
  },
  scoreLabel: {
    color: theme.palette.silver,
    marginBottom: theme.spacing.md,
    ...theme.typography.caption,
  },
  components: {
    gap: theme.spacing.sm,
  },
  componentRow: {
    gap: 4,
  },
  componentLabel: {
    color: theme.palette.platinum,
    textTransform: 'capitalize',
    ...theme.typography.caption,
  },
  barBackground: {
    height: 8,
    backgroundColor: theme.palette.titanium,
    borderRadius: 6,
  },
  barFill: {
    height: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  componentValue: {
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
  sectionTitle: {
    color: theme.palette.titanium,
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.sm,
  },
  mentorText: {
    color: theme.palette.platinum,
    ...theme.typography.body,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.palette.midnight,
  },
  emptyTitle: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
});
