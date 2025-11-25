import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { EmptyState } from '@components/EmptyState';
import { LoadingOverlay } from '@components/LoadingOverlay';
import { MetalPanel } from '@components/MetalPanel';
import { BadgePill } from '@components/soulmatch/BadgePill';
import { CompatibilityBar } from '@components/soulmatch/CompatibilityBar';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import { SoulMatchStackParamList } from '@navigation/types';
import { SoulmatchResult } from '@schemas/soulmatch';
import { fetchRecommendations } from '@services/api/soulmatch';
import { buildBadges, formatScore, scoreTone } from '@utils/soulmatch';
import { theme } from '@theme/index';

type Nav = NativeStackNavigationProp<SoulMatchStackParamList>;

type Props = {
  initialItems?: SoulmatchResult[];
  skipAutoLoad?: boolean;
};

function AnimatedCard({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useFocusEffect(
    useCallback(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 320,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }, [delay, opacity, scale]),
  );

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>{children}</Animated.View>
  );
}

function RecommendationCard({
  item,
  onPress,
  index,
}: {
  item: SoulmatchResult;
  onPress: () => void;
  index: number;
}) {
  const target = item.user;
  const badges = useMemo(() => buildBadges(item, 3), [item]);
  const tone = scoreTone(item.score);
  return (
    <TouchableOpacity onPress={onPress}>
      <AnimatedCard delay={index * 60}>
        <MetalPanel glow style={styles.card}>
          <View style={styles.cardHeader}>
            <UserAvatar size={52} uri={target.photo ?? undefined} label={target.name} />
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardName}>{target.name || target.handle}</Text>
              <Text style={styles.cardHandle}>@{target.handle}</Text>
              <View style={styles.progressRow}>
                <CompatibilityBar value={item.score} size="sm" />
                <Text style={styles.scoreValue}>{formatScore(item.score)}</Text>
              </View>
            </View>
            <View style={[styles.scorePill, tone === 'positive' && styles.scorePillGood]}>
              <Text style={styles.scorePillText}>{formatScore(item.score)}</Text>
            </View>
          </View>
          {badges.length > 0 ? (
            <View style={styles.tags}>
              {badges.map((tag) => (
                <BadgePill key={tag} label={tag} tone={tone === 'warning' ? 'warning' : 'default'} />
              ))}
            </View>
          ) : null}
        </MetalPanel>
      </AnimatedCard>
    </TouchableOpacity>
  );
}

export function SoulMatchRecommendationsScreen({
  initialItems = [],
  skipAutoLoad = false,
}: Props) {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const [items, setItems] = useState<SoulmatchResult[]>(initialItems);
  const [loading, setLoading] = useState(!initialItems.length);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (skipAutoLoad && initialItems.length) {
      return;
    }
    setLoading(true);
    try {
      const data = await fetchRecommendations();
      setItems(data);
    } catch (error) {
      console.error('SoulMatch recommendations failed', error);
      toast.push({
        message: 'Unable to load recommendations.',
        tone: 'error',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      if (!skipAutoLoad) {
        load().catch(() => undefined);
      }
    }, [load, skipAutoLoad]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderItem = ({ item, index }: { item: SoulmatchResult; index: number }) => (
    <RecommendationCard
      item={item}
      index={index}
      onPress={() =>
        navigation.navigate('SoulMatchDetail', {
          userId: item.user.id,
          displayName: item.user.name || item.user.handle,
        })
      }
    />
  );

  if (loading) {
    return <LoadingOverlay label="Finding your SoulMatches…" />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.user?.id ?? item.user_id ?? Math.random())}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No matches yet"
            description="Once your chart and profile are complete, recommendations will appear here."
            actionLabel="Refresh"
            onAction={load}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.palette.titanium,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardName: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
  cardHandle: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  scorePill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.palette.titanium,
    borderWidth: 1,
    borderColor: theme.palette.steel,
  },
  scorePillGood: {
    backgroundColor: theme.palette.glow,
    borderColor: theme.palette.glow,
  },
  scorePillText: {
    color: theme.palette.pearl,
    ...theme.typography.caption,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  scoreValue: {
    color: theme.palette.pearl,
    ...theme.typography.caption,
  },
});
