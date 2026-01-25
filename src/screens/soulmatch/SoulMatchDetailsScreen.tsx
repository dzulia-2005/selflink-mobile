import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { BadgePill } from '@components/soulmatch/BadgePill';
import { CompatibilityBar } from '@components/soulmatch/CompatibilityBar';
import { LoadingView } from '@components/StateViews';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import { SoulMatchStackParamList } from '@navigation/types';
import { SoulmatchResult } from '@schemas/soulmatch';
import { fetchSoulmatchMentor, fetchSoulmatchWith } from '@services/api/soulmatch';
import { useAuthStore } from '@store/authStore';
import { theme } from '@theme/index';
import { normalizeApiError } from '@utils/apiErrors';
import { buildBadges, formatScore, scoreTone } from '@utils/soulmatch';

type Route = RouteProp<SoulMatchStackParamList, 'SoulMatchDetail'>;
type Nav = NativeStackNavigationProp<SoulMatchStackParamList>;

type Props = {
  prefetchedData?: SoulmatchResult | null;
  skipAutoLoad?: boolean;
};

export function SoulMatchDetailsScreen({
  prefetchedData = null,
  skipAutoLoad = false,
}: Props) {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { userId, displayName } = route.params;
  const toast = useToast();
  const logout = useAuthStore((state) => state.logout);
  const [data, setData] = useState<SoulmatchResult | null>(prefetchedData);
  const [loading, setLoading] = useState(!prefetchedData);
  const [mentorText, setMentorText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(12)).current;

  const title = useMemo(() => displayName || 'SoulMatch', [displayName]);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('SoulMatch: detail fetch start', { userId });
      }
      const result = await fetchSoulmatchWith(userId);
      setData(result);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('SoulMatch: detail fetch ok', {
          userId,
          hasScore: typeof (result as SoulmatchResult).score === 'number',
        });
      }
    } catch (error) {
      const normalized = normalizeApiError(error, 'Unable to load match details.');
      if (normalized.status === 401 || normalized.status === 403) {
        toast.push({ message: normalized.message, tone: 'error', duration: 4000 });
        logout();
        return;
      }
      toast.push({ message: normalized.message, tone: 'error', duration: 4000 });
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('SoulMatch: detail fetch error', normalized);
      }
    } finally {
      setLoading(false);
    }
  }, [logout, toast, userId]);

  useEffect(() => {
    navigation.setOptions?.({ title });
    if (!skipAutoLoad) {
      load().catch(() => undefined);
    } else {
      setLoading(false);
    }
  }, [load, navigation, skipAutoLoad, title]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslate, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [data?.score, headerOpacity, headerTranslate]);

  const loadMentor = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      const result = await fetchSoulmatchMentor(userId);
      setMentorText(result.mentor_text ?? '');
      setData((prev: SoulmatchResult | null) =>
        prev
          ? {
              ...prev,
              tags: result.tags ?? prev.tags,
              components: result.components ?? prev.components,
            }
          : result,
      );
    } catch (error) {
      const normalized = normalizeApiError(error, 'Mentor is unavailable. Try again later.');
      if (normalized.status === 401 || normalized.status === 403) {
        toast.push({ message: normalized.message, tone: 'error' });
        logout();
        return;
      }
      toast.push({ message: normalized.message, tone: 'error' });
    }
  }, [logout, toast, userId]);

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

  const isPending = typeof data.score !== 'number';
  if (isPending) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>SoulMatch is being calculated.</Text>
        <Text style={styles.emptySubtitle}>
          Pull to refresh in a moment to see your compatibility.
        </Text>
        <MetalButton title="Refresh" onPress={load} />
        <MetalButton title="Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const components = data.components || {
    astro: 0,
    matrix: 0,
    psychology: 0,
    lifestyle: 0,
  };
  const badges = buildBadges(data, 4);
  const tone = scoreTone(data.score);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      <Animated.View
        style={[
          styles.headerBlock,
          { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] },
        ]}
      >
        <UserAvatar size={72} uri={data.user?.photo ?? undefined} label={title} />
        <Text style={styles.headline}>{title}</Text>
        <Text style={styles.subtitle}>SoulMatch compatibility</Text>
        <MetalPanel glow style={styles.heroPanel}>
          <View style={styles.heroScoreRow}>
            <Text style={styles.scoreValue}>{formatScore(data.score)}</Text>
            <BadgePill
              label={tone === 'positive' ? 'High vibe' : 'Aligned'}
              tone={tone}
            />
          </View>
          <View style={styles.heroBar}>
            <CompatibilityBar value={data.score} />
            <Text style={styles.scoreLabel}>Overall compatibility</Text>
          </View>
        </MetalPanel>
      </Animated.View>

      <MetalPanel>
        <Text style={styles.sectionTitle}>Highlights</Text>
        <View style={styles.tagRow}>
          {badges.map((tag) => (
            <BadgePill key={tag} label={tag} tone={tone} />
          ))}
        </View>
      </MetalPanel>

      <MetalPanel>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <View style={styles.components}>
          {Object.entries(components).map(([key, value]) => (
            <View key={key} style={styles.componentRow}>
              <View style={styles.componentHeader}>
                <Text style={styles.componentLabel}>{key}</Text>
                <Text style={styles.componentValue}>{formatScore(value ?? 0)}</Text>
              </View>
              <CompatibilityBar value={value ?? 0} size="sm" />
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
          title="Ask Mentor About Us"
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
  headerBlock: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  heroPanel: {
    width: '100%',
    borderColor: theme.palette.glow,
    borderWidth: 1,
  },
  heroScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  heroBar: {
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
  components: {
    gap: theme.spacing.sm,
  },
  componentRow: {
    gap: 4,
    marginBottom: theme.spacing.sm,
  },
  componentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  componentLabel: {
    color: theme.palette.platinum,
    textTransform: 'capitalize',
    ...theme.typography.caption,
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
  emptySubtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
    textAlign: 'center',
  },
});
