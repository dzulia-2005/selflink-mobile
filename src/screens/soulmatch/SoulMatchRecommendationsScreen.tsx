import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SoulMatchUpgradeSheet } from '@components/soulmatch/SoulMatchUpgradeSheet';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import { SoulMatchStackParamList } from '@navigation/types';
import {
  SoulmatchExplainLevel,
  SoulmatchMode,
  SoulmatchResult,
} from '@schemas/soulmatch';
import {
  fetchRecommendations,
  type SoulmatchRecommendationsMeta,
} from '@services/api/soulmatch';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';
import { normalizeApiError } from '@utils/apiErrors';
import { buildBadges, formatScore, scoreTone } from '@utils/soulmatch';
import {
  normalizeSoulmatchRecommendations,
  normalizeSoulmatchRecsResponse,
} from '@utils/soulmatchRecommendations';
import {
  FREE_RECOMMENDATION_LIMIT,
  isExplainLevelLocked,
  isSectionLocked,
  requiredTierForExplain,
  type SoulmatchTier,
} from '@utils/soulmatchUpgradeGate';

type Nav = NativeStackNavigationProp<SoulMatchStackParamList>;

type Props = {
  initialItems?: SoulmatchResult[];
  skipAutoLoad?: boolean;
};

const EXPLAIN_LEVELS: Array<{ label: string; value: SoulmatchExplainLevel }> = [
  { label: 'Free', value: 'free' },
  { label: 'Premium', value: 'premium' },
  { label: 'Premium+', value: 'premium_plus' },
];

const MODE_LEVELS: Array<{ label: string; value: SoulmatchMode }> = [
  { label: 'Compat', value: 'compat' },
  { label: 'Dating', value: 'dating' },
];

function AnimatedCard({ children, delay }: { children: React.ReactNode; delay: number }) {
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
  showLensHeader,
  userTier,
  onRequestUpgrade,
  styles,
}: {
  item: SoulmatchResult;
  onPress: () => void;
  index: number;
  showLensHeader: boolean;
  userTier: SoulmatchTier;
  onRequestUpgrade: (tier: Exclude<SoulmatchTier, 'free'>) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const target = item.user;
  const badges = useMemo(() => buildBadges(item, 3), [item]);
  const tone = scoreTone(item.score);
  const lensLabel = item.lens_label ?? item.lens;
  const lensReason = item.lens_reason_short ?? item.explanation?.short;
  const explanationShort = item.explanation?.short;
  const showShort = explanationShort && explanationShort !== lensReason;
  const lockedFull = isSectionLocked('full', userTier) && Boolean(item.explanation?.full);
  const lockedStrategy =
    isSectionLocked('strategy', userTier) && Boolean(item.explanation?.strategy);
  const showFull = !lockedFull && item.explanation?.full;
  const showStrategy = !lockedStrategy && item.explanation?.strategy;
  const timingWindowLabel = item.timing_window?.label;
  const timingSummary = item.timing_summary;
  const trend = item.compatibility_trend;

  return (
    <TouchableOpacity onPress={onPress}>
      <AnimatedCard delay={index * 60}>
        <MetalPanel glow style={styles.card}>
          {showLensHeader && lensLabel ? (
            <View style={styles.lensHeader}>
              <BadgePill label={lensLabel} tone="default" />
            </View>
          ) : null}
          <View style={styles.cardHeader}>
            <UserAvatar size={52} uri={target.photo ?? undefined} label={target.name} />
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardName}>{target.name || target.handle}</Text>
              <Text style={styles.cardHandle}>@{target.handle}</Text>
              {lensReason ? (
                <Text style={styles.lensReasonInline} numberOfLines={1}>
                  {lensReason}
                </Text>
              ) : null}
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
                <BadgePill
                  key={tag}
                  label={tag}
                  tone={tone === 'warning' ? 'warning' : 'default'}
                />
              ))}
            </View>
          ) : null}
          {showShort ? <Text style={styles.explainShort}>{explanationShort}</Text> : null}
          {timingSummary || timingWindowLabel ? (
            <View style={styles.timingRow}>
              <Text style={styles.timingLabel}>
                Timing: {timingSummary || timingWindowLabel}
              </Text>
              {timingWindowLabel &&
              timingSummary &&
              !isSectionLocked('timing', userTier) ? (
                <Text style={styles.timingWindow}>{timingWindowLabel}</Text>
              ) : null}
              {trend && !isSectionLocked('timing', userTier) ? (
                <Text style={styles.timingTrend}>{trend}</Text>
              ) : null}
              {isSectionLocked('timing', userTier) && (timingWindowLabel || trend) ? (
                <TouchableOpacity
                  onPress={() => onRequestUpgrade('premium')}
                  style={styles.unlockLink}
                >
                  <Text style={styles.unlockText}>Unlock timing details</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          {showFull ? (
            <ExpandableSection
              title="More"
              text={item.explanation?.full}
              styles={styles}
            />
          ) : lockedFull ? (
            <TouchableOpacity onPress={() => onRequestUpgrade('premium')}>
              <Text style={styles.unlockText}>Unlock to see more</Text>
            </TouchableOpacity>
          ) : null}
          {showStrategy ? (
            <ExpandableSection
              title="How to approach"
              text={item.explanation?.strategy}
              styles={styles}
            />
          ) : lockedStrategy ? (
            <TouchableOpacity onPress={() => onRequestUpgrade('premium_plus')}>
              <Text style={styles.unlockText}>Unlock premium strategy</Text>
            </TouchableOpacity>
          ) : null}
        </MetalPanel>
      </AnimatedCard>
    </TouchableOpacity>
  );
}

function ExpandableSection({
  title,
  text,
  styles,
}: {
  title: string;
  text?: string | null;
  styles: ReturnType<typeof createStyles>;
}) {
  const [open, setOpen] = useState(false);
  if (!text) {
    return null;
  }
  return (
    <View style={styles.expandSection}>
      <TouchableOpacity
        style={styles.expandHeader}
        onPress={() => setOpen((prev) => !prev)}
      >
        <Text style={styles.expandTitle}>{title}</Text>
        <Text style={styles.expandToggle}>{open ? 'Hide' : 'Show'}</Text>
      </TouchableOpacity>
      {open ? <Text style={styles.expandBody}>{text}</Text> : null}
    </View>
  );
}

export function SoulMatchRecommendationsScreen({
  initialItems = [],
  skipAutoLoad = false,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const logout = useAuthStore((state) => state.logout);
  const [meta, setMeta] = useState<SoulmatchRecommendationsMeta | null>(null);
  const [explainLevel, setExplainLevel] = useState<SoulmatchExplainLevel>('free');
  const explainRef = useRef<SoulmatchExplainLevel>('free');
  const [mode, setMode] = useState<SoulmatchMode>('compat');
  const modeRef = useRef<SoulmatchMode>('compat');
  const userTier: SoulmatchTier = 'free';
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [requestedTier, setRequestedTier] =
    useState<Exclude<SoulmatchTier, 'free'>>('premium');
  const [items, setItems] = useState<SoulmatchResult[]>(
    normalizeSoulmatchRecommendations(initialItems as SoulmatchResult[]).items,
  );
  const [loading, setLoading] = useState(!initialItems.length);
  const [refreshing, setRefreshing] = useState(false);
  const [showDebug, setShowDebug] = useState(true);

  const load = useCallback(
    async (modeHint?: 'refresh') => {
      if (skipAutoLoad && initialItems.length) {
        return;
      }
      if (modeHint !== 'refresh') {
        setLoading(true);
      }
      try {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.debug('SoulMatch: recommendations fetch start', { explainLevel, mode });
        }
        const raw = await fetchRecommendations({ includeMeta: true, explainLevel, mode });
        const normalized = normalizeSoulmatchRecsResponse(raw);
        setItems(normalized.results);
        setMeta(normalized.meta ?? null);
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.debug('SoulMatch: recommendations fetch ok', {
            total: Array.isArray(raw) ? raw.length : (raw?.results?.length ?? 0),
            normalized: normalized.results.length,
            dropped: normalized.dropped,
            meta: normalized.meta,
          });
        }
      } catch (error) {
        const normalized = normalizeApiError(error, 'Unable to load recommendations.');
        if (normalized.status === 401 || normalized.status === 403) {
          toast.push({ message: normalized.message, tone: 'error', duration: 4000 });
          logout();
          return;
        }
        setMeta(null);
        toast.push({ message: normalized.message, tone: 'error', duration: 4000 });
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.debug('SoulMatch: recommendations fetch error', normalized);
        }
      } finally {
        setLoading(false);
      }
    },
    [explainLevel, initialItems.length, logout, mode, skipAutoLoad, toast],
  );

  useFocusEffect(
    useCallback(() => {
      if (!skipAutoLoad) {
        load().catch(() => undefined);
      }
    }, [load, skipAutoLoad]),
  );

  useEffect(() => {
    if (skipAutoLoad && initialItems.length) {
      return;
    }
    if (explainRef.current === explainLevel && modeRef.current === mode) {
      return;
    }
    explainRef.current = explainLevel;
    modeRef.current = mode;
    load('refresh').catch(() => undefined);
  }, [explainLevel, initialItems.length, load, mode, skipAutoLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load('refresh');
    setRefreshing(false);
  }, [load]);

  const renderItem = ({ item, index }: { item: SoulmatchResult; index: number }) => {
    const currentLens = item.lens_label ?? item.lens;
    const previous = items[index - 1];
    const previousLens = previous ? (previous.lens_label ?? previous.lens) : null;
    const showLensHeader = Boolean(currentLens && currentLens !== previousLens);
    return (
      <RecommendationCard
        item={item}
        index={index}
        showLensHeader={showLensHeader}
        userTier={userTier}
        onRequestUpgrade={(tier) => {
          setRequestedTier(tier);
          setUpgradeVisible(true);
        }}
        styles={styles}
        onPress={() =>
          navigation.navigate('SoulMatchDetail', {
            userId: item.user.id,
            displayName: item.user.name || item.user.handle,
            explainLevel,
            mode,
          })
        }
      />
    );
  };

  if (loading) {
    return <LoadingOverlay label="Finding your SoulMatches…" />;
  }

  const missing = meta?.missing_requirements ?? [];
  const missingBirth =
    missing.includes('birth_date') ||
    missing.includes('birth_time') ||
    missing.includes('birth_place');
  const emptyReason = meta?.empty_reason ?? meta?.reason;
  const emptyDescription =
    missingBirth ||
    emptyReason === 'missing_birth_data' ||
    emptyReason === 'chart_incomplete'
      ? 'Complete your birth data to get matches.'
      : emptyReason === 'missing_profile_fields'
        ? 'Complete your profile (gender and orientation) to get matches.'
        : emptyReason === 'no_candidates'
          ? 'No candidates yet — invite friends or try later.'
          : 'Once your chart and profile are complete, recommendations will appear here.';

  const displayItems =
    userTier === 'free' ? items.slice(0, FREE_RECOMMENDATION_LIMIT) : items;

  const shouldShowUpgradeFooter =
    userTier === 'free' && items.length > displayItems.length;

  return (
    <View style={styles.container}>
      {typeof __DEV__ !== 'undefined' && __DEV__ ? (
        <View style={styles.debugPanel}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>SoulMatch Debug</Text>
            <TouchableOpacity onPress={() => setShowDebug((prev) => !prev)}>
              <Text style={styles.debugToggle}>{showDebug ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          {showDebug ? (
            <View>
              <Text style={styles.debugLine}>mode: {meta?.mode ?? '?'}</Text>
              <Text style={styles.debugLine}>reason: {meta?.reason ?? '?'}</Text>
              {meta?.missing_requirements?.length ? (
                <Text style={styles.debugLine}>
                  missing: {meta.missing_requirements.join(', ')}
                </Text>
              ) : null}
              <Text style={styles.debugLine}>results: {items.length}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <FlatList
        data={displayItems}
        keyExtractor={(item, index) => String(item.user?.id ?? item.user_id ?? index)}
        ListHeaderComponent={
          <View style={styles.explainRow}>
            <View style={styles.modeRow}>
              <Text style={styles.explainLabel}>Mode</Text>
              <View style={styles.explainPills}>
                {MODE_LEVELS.map((option) => {
                  const active = option.value === mode;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.explainPill, active && styles.explainPillActive]}
                      onPress={() => setMode(option.value)}
                    >
                      <Text
                        style={[
                          styles.explainPillText,
                          active && styles.explainPillTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <Text style={styles.explainLabel}>Explain</Text>
            <View style={styles.explainPills}>
              {EXPLAIN_LEVELS.map((option) => {
                const active = option.value === explainLevel;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.explainPill, active && styles.explainPillActive]}
                    onPress={() => {
                      if (isExplainLevelLocked(option.value, userTier)) {
                        const required = requiredTierForExplain(option.value);
                        if (required !== 'free') {
                          setRequestedTier(required);
                          setUpgradeVisible(true);
                        }
                        return;
                      }
                      setExplainLevel(option.value);
                    }}
                  >
                    <Text
                      style={[
                        styles.explainPillText,
                        active && styles.explainPillTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListFooterComponent={
          shouldShowUpgradeFooter ? (
            <TouchableOpacity
              style={styles.upgradeFooter}
              onPress={() => {
                setRequestedTier('premium');
                setUpgradeVisible(true);
              }}
            >
              <Text style={styles.upgradeFooterTitle}>See more matches</Text>
              <Text style={styles.upgradeFooterSubtitle}>
                Unlock Premium to view the full list.
              </Text>
            </TouchableOpacity>
          ) : null
        }
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
            description={emptyDescription}
            actionLabel="Refresh"
            onAction={load}
          />
        }
      />
      <SoulMatchUpgradeSheet
        visible={upgradeVisible}
        selectedTier={requestedTier}
        onClose={() => setUpgradeVisible(false)}
        onContinueFree={() => setUpgradeVisible(false)}
        onSelectTier={(tier) => {
          setUpgradeVisible(false);
          setRequestedTier(tier);
          navigation.getParent()?.navigate('Payments' as never);
        }}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.palette.midnight,
    },
    listContent: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    explainRow: {
      marginBottom: theme.spacing.sm,
    },
    modeRow: {
      marginBottom: theme.spacing.sm,
    },
    explainLabel: {
      color: theme.palette.silver,
      ...theme.typography.caption,
      marginBottom: theme.spacing.xs,
    },
    explainPills: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    explainPill: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.palette.midnight,
      borderWidth: 1,
      borderColor: theme.palette.titanium,
    },
    explainPillActive: {
      backgroundColor: theme.palette.glow,
      borderColor: theme.palette.glow,
    },
    explainPillText: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    explainPillTextActive: {
      color: theme.palette.midnight,
      fontWeight: '700',
    },
    card: {
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.palette.titanium,
    },
    lensHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
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
    lensReasonInline: {
      color: theme.palette.silver,
      ...theme.typography.caption,
      marginTop: 2,
    },
    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    explainShort: {
      marginTop: theme.spacing.sm,
      color: theme.palette.pearl,
      ...theme.typography.body,
    },
    timingRow: {
      marginTop: theme.spacing.sm,
      gap: 2,
    },
    timingLabel: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    timingWindow: {
      color: theme.palette.titanium,
      ...theme.typography.caption,
    },
    timingTrend: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    unlockLink: {
      marginTop: theme.spacing.xs,
    },
    unlockText: {
      color: theme.palette.glow,
      ...theme.typography.caption,
    },
    expandSection: {
      marginTop: theme.spacing.sm,
    },
    expandHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    expandTitle: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    expandToggle: {
      color: theme.palette.glow,
      ...theme.typography.caption,
    },
    expandBody: {
      marginTop: theme.spacing.xs,
      color: theme.palette.pearl,
      ...theme.typography.body,
    },
    upgradeFooter: {
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.palette.glow,
      backgroundColor: 'rgba(56,189,248,0.08)',
      alignItems: 'center',
    },
    upgradeFooterTitle: {
      color: theme.palette.platinum,
      ...theme.typography.subtitle,
    },
    upgradeFooterSubtitle: {
      color: theme.palette.silver,
      ...theme.typography.caption,
      marginTop: theme.spacing.xs,
      textAlign: 'center',
    },
    debugPanel: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.palette.titanium,
      backgroundColor: theme.palette.midnight,
    },
    debugHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    debugTitle: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    debugToggle: {
      color: theme.palette.glow,
      ...theme.typography.caption,
    },
    debugLine: {
      color: theme.palette.pearl,
      fontFamily: 'monospace',
      fontSize: 12,
      marginTop: 2,
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
