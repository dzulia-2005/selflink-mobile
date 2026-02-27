import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { BadgePill } from '@components/soulmatch/BadgePill';
import { CompatibilityBar } from '@components/soulmatch/CompatibilityBar';
import { SoulMatchUpgradeSheet } from '@components/soulmatch/SoulMatchUpgradeSheet';
import { LoadingView } from '@components/StateViews';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import { SoulMatchStackParamList } from '@navigation/types';
import { SoulmatchAsyncResult, SoulmatchResult } from '@schemas/soulmatch';
import {
  fetchSoulmatchMentor,
  fetchSoulmatchWith,
  isSoulmatchAsyncResult,
  isSoulmatchWithSuccess,
} from '@services/api/soulmatch';
import { useAuthStore } from '@store/authStore';
import { selectTierFromEntitlements, useEntitlementsStore } from '@store/entitlementsStore';
import { useTheme, type Theme } from '@theme';
import { normalizeApiError } from '@utils/apiErrors';
import { buildBadges, formatScore, scoreTone } from '@utils/soulmatch';
import { isSectionLocked, type SoulmatchTier } from '@utils/soulmatchUpgradeGate';

type Route = RouteProp<SoulMatchStackParamList, 'SoulMatchDetail'>;
type Nav = NativeStackNavigationProp<SoulMatchStackParamList>;

type Props = {
  prefetchedData?: SoulmatchResult | null;
  skipAutoLoad?: boolean;
};

const PENDING_RETRY_DELAYS_MS = [1000, 2000, 4000];

export function SoulMatchDetailsScreen({
  prefetchedData = null,
  skipAutoLoad = false,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { userId, displayName, explainLevel = 'free', mode = 'compat' } = route.params;
  const toast = useToast();
  const logout = useAuthStore((state) => state.logout);
  const entitlements = useEntitlementsStore((state) => state.entitlements);
  const userTier: SoulmatchTier = selectTierFromEntitlements(entitlements);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [requestedTier, setRequestedTier] = useState<'premium' | 'premium_plus'>(
    'premium',
  );
  const [data, setData] = useState<SoulmatchResult | null>(prefetchedData);
  const [pendingTask, setPendingTask] = useState<SoulmatchAsyncResult | null>(null);
  const [loading, setLoading] = useState(!prefetchedData);
  const [mentorText, setMentorText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(12)).current;
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = useMemo(
    () => displayName || t('soulmatch.details.defaultTitle'),
    [displayName, t],
  );

  const clearPendingTimer = useCallback(() => {
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  }, []);

  const load = useCallback(async (options?: { polling?: boolean; attempt?: number }) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const attempt = options?.attempt ?? 0;
    if (!options?.polling) {
      setLoading(true);
    }
    clearPendingTimer();
    try {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('SoulMatch: detail fetch start', { userId });
      }
      const result = await fetchSoulmatchWith(userId, { explainLevel, mode });
      if (isSoulmatchAsyncResult(result)) {
        setPendingTask(result);
        setData(null);
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.debug('SoulMatch: detail fetch pending', {
            userId,
            task_id: result.task_id,
            pair_key: result.pair_key,
            rules_version: result.rules_version,
          });
        }
        if (attempt < PENDING_RETRY_DELAYS_MS.length) {
          const delay = PENDING_RETRY_DELAYS_MS[attempt];
          pendingTimeoutRef.current = setTimeout(() => {
            load({ polling: true, attempt: attempt + 1 }).catch(() => undefined);
          }, delay);
        }
        return;
      }
      setPendingTask(null);
      if (isSoulmatchWithSuccess(result)) {
        setData(result);
      } else {
        setData(result as SoulmatchResult);
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('SoulMatch: detail fetch ok', {
          userId,
          hasScore: typeof (result as SoulmatchResult).score === 'number',
        });
      }
    } catch (error) {
      const normalized = normalizeApiError(
        error,
        t('soulmatch.details.alerts.loadFailed'),
      );
      if (!options?.polling) {
        if (normalized.status === 401 || normalized.status === 403) {
          toast.push({ message: normalized.message, tone: 'error', duration: 4000 });
          logout();
          return;
        }
        toast.push({ message: normalized.message, tone: 'error', duration: 4000 });
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('SoulMatch: detail fetch error', normalized);
      }
    } finally {
      if (!options?.polling) {
        setLoading(false);
      }
    }
  }, [clearPendingTimer, explainLevel, logout, mode, t, toast, userId]);

  useEffect(() => {
    navigation.setOptions?.({ title });
    if (!skipAutoLoad) {
      load().catch(() => undefined);
    } else {
      setLoading(false);
    }
  }, [load, navigation, skipAutoLoad, title]);

  useEffect(() => {
    return () => {
      clearPendingTimer();
    };
  }, [clearPendingTimer]);

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
      const normalized = normalizeApiError(
        error,
        t('soulmatch.details.alerts.mentorUnavailable'),
      );
      if (normalized.status === 401 || normalized.status === 403) {
        toast.push({ message: normalized.message, tone: 'error' });
        logout();
        return;
      }
      toast.push({ message: normalized.message, tone: 'error' });
    }
  }, [logout, t, toast, userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return <LoadingView message={t('soulmatch.details.loading')} />;
  }

  if (pendingTask) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('soulmatch.details.pending.title')}</Text>
        <Text style={styles.emptySubtitle}>{t('soulmatch.details.pending.subtitle')}</Text>
        {typeof __DEV__ !== 'undefined' && __DEV__ ? (
          <Text style={styles.emptySubtitle}>
            {t('soulmatch.details.pending.task', {
              taskId: pendingTask.task_id,
              pairKey: pendingTask.pair_key,
            })}
          </Text>
        ) : null}
        <MetalButton title={t('soulmatch.details.actions.refresh')} onPress={() => load()} />
        <MetalButton title={t('common.back')} onPress={() => navigation.goBack()} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('soulmatch.details.empty.unableToLoad')}</Text>
        <MetalButton title={t('common.back')} onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const isPending = typeof data.score !== 'number';
  if (isPending) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('soulmatch.details.pending.title')}</Text>
        <Text style={styles.emptySubtitle}>{t('soulmatch.details.pending.subtitle')}</Text>
        <MetalButton title={t('soulmatch.details.actions.refresh')} onPress={() => load()} />
        <MetalButton title={t('common.back')} onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const components = data.components || {
    astro: 0,
    matrix: 0,
    psychology: 0,
    lifestyle: 0,
  };
  const componentEntries = Object.entries(components);
  const topComponent = componentEntries.reduce(
    (best, current) => (current[1] > best[1] ? current : best),
    componentEntries[0],
  );
  const badges = buildBadges(data, 4);
  const lensLabel = data.lens_label ?? data.lens;
  const lensReason = data.lens_reason_short ?? data.explanation?.short;
  const tone = scoreTone(data.score);
  const lockedFull = isSectionLocked('full', userTier) && Boolean(data.explanation?.full);
  const lockedStrategy =
    isSectionLocked('strategy', userTier) && Boolean(data.explanation?.strategy);
  const showFull = !lockedFull && data.explanation?.full;
  const showStrategy = !lockedStrategy && data.explanation?.strategy;
  const timingSummary = data.timing_summary;
  const timingWindow = data.timing_window?.label;
  const trend = data.compatibility_trend;

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
        <Text style={styles.subtitle}>{t('soulmatch.details.subtitle')}</Text>
        <MetalPanel glow style={styles.heroPanel}>
          <View style={styles.heroScoreRow}>
            <Text style={styles.scoreValue}>{formatScore(data.score)}</Text>
            <BadgePill
              label={
                tone === 'positive'
                  ? t('soulmatch.details.scoreBadge.highVibe')
                  : t('soulmatch.details.scoreBadge.aligned')
              }
              tone={tone}
            />
          </View>
          <View style={styles.heroBar}>
            <CompatibilityBar value={data.score} />
            <Text style={styles.scoreLabel}>{t('soulmatch.details.overallCompatibility')}</Text>
          </View>
        </MetalPanel>
      </Animated.View>

      <MetalPanel>
        <Text style={styles.sectionTitle}>{t('soulmatch.details.sections.highlights')}</Text>
        <View style={styles.tagRow}>
          {lensLabel ? <BadgePill label={lensLabel} tone="default" /> : null}
          {badges.map((tag) => (
            <BadgePill key={tag} label={tag} tone={tone} />
          ))}
        </View>
        {lensReason ? <Text style={styles.body}>{lensReason}</Text> : null}
      </MetalPanel>

      <MetalPanel>
        <Text style={styles.sectionTitle}>{t('soulmatch.details.sections.scoreBreakdown')}</Text>
        {isSectionLocked('full', userTier) ? (
          <>
            <Text style={styles.body}>
              {t('soulmatch.details.scoreBreakdown.lockedBody')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setRequestedTier('premium');
                setUpgradeVisible(true);
              }}
            >
              <Text style={styles.unlockText}>
                {t('soulmatch.details.scoreBreakdown.unlock')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.components}>
              {componentEntries.map(([key, value]) => (
                <View key={key} style={styles.componentRow}>
                  <View style={styles.componentHeader}>
                    <Text style={styles.componentLabel}>
                      {t(`soulmatch.details.components.${key}`, {
                        defaultValue: key,
                      })}
                    </Text>
                    <Text style={styles.componentValue}>{formatScore(value ?? 0)}</Text>
                  </View>
                  <CompatibilityBar value={value ?? 0} size="sm" />
                </View>
              ))}
            </View>
            {topComponent ? (
              <Text style={styles.muted}>
                {t('soulmatch.details.scoreBreakdown.strongestSignal', {
                  component: t(`soulmatch.details.components.${topComponent[0]}`, {
                    defaultValue: topComponent[0],
                  }),
                  score: formatScore(topComponent[1]),
                })}
              </Text>
            ) : null}
          </>
        )}
      </MetalPanel>

      {(data.explanation?.short || showFull) && (
        <MetalPanel>
          <Text style={styles.sectionTitle}>{t('soulmatch.details.sections.whyMatch')}</Text>
          {data.explanation?.short ? (
            <Text style={styles.body}>{data.explanation.short}</Text>
          ) : null}
          {showFull ? (
            <ExpandableSection
              title={t('soulmatch.details.actions.more')}
              text={data.explanation?.full}
              styles={styles}
            />
          ) : lockedFull ? (
            <TouchableOpacity
              onPress={() => {
                setRequestedTier('premium');
                setUpgradeVisible(true);
              }}
            >
              <Text style={styles.unlockText}>
                {t('soulmatch.details.actions.unlockWhyScore')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </MetalPanel>
      )}

      {data.explanation?.strategy || lockedStrategy ? (
        <MetalPanel>
          <Text style={styles.sectionTitle}>{t('soulmatch.details.sections.howToApproach')}</Text>
          {showStrategy ? (
            <Text style={styles.body}>{data.explanation?.strategy}</Text>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setRequestedTier('premium_plus');
                setUpgradeVisible(true);
              }}
            >
              <Text style={styles.unlockText}>
                {t('soulmatch.details.actions.unlockApproach')}
              </Text>
            </TouchableOpacity>
          )}
        </MetalPanel>
      ) : null}

      {timingSummary || timingWindow || trend ? (
        <MetalPanel>
          <Text style={styles.sectionTitle}>{t('soulmatch.details.sections.timing')}</Text>
          {timingSummary ? <Text style={styles.body}>{timingSummary}</Text> : null}
          {!isSectionLocked('timing', userTier) ? (
            <>
              {timingWindow ? (
                <Text style={styles.timingLabel}>{timingWindow}</Text>
              ) : null}
              {trend ? <Text style={styles.timingLabel}>{trend}</Text> : null}
            </>
          ) : timingWindow || trend || timingSummary ? (
            <TouchableOpacity
              onPress={() => {
                setRequestedTier('premium');
                setUpgradeVisible(true);
              }}
            >
              <Text style={styles.unlockText}>
                {t('soulmatch.details.actions.unlockTiming')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </MetalPanel>
      ) : null}

      <MetalPanel>
        <Text style={styles.sectionTitle}>{t('soulmatch.details.sections.mentorInsight')}</Text>
        {mentorText ? (
          <Text style={styles.mentorText}>{mentorText}</Text>
        ) : (
          <MetalButton
            title={t('soulmatch.details.actions.loadMentorInsight')}
            onPress={loadMentor}
          />
        )}
        <MetalButton
          title={t('soulmatch.details.actions.askMentorAboutUs')}
          onPress={() =>
            navigation.navigate('SoulMatchMentor', {
              userId: data.user?.id ?? data.user_id ?? userId,
              displayName: displayName || data.user?.name || data.user?.handle,
            })
          }
        />
      </MetalPanel>

      <MetalButton
        title={t('soulmatch.details.actions.backToRecommendations')}
        onPress={() => navigation.goBack()}
      />
      <SoulMatchUpgradeSheet
        visible={upgradeVisible}
        selectedTier={requestedTier}
        onClose={() => setUpgradeVisible(false)}
        onContinueFree={() => setUpgradeVisible(false)}
        onSelectTier={(tier) => {
          setUpgradeVisible(false);
          setRequestedTier(tier);
          (navigation.getParent() as any)?.navigate('Profile', { screen: 'Payments' });
        }}
      />
    </ScrollView>
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
  const { t } = useTranslation();
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
        <Text style={styles.expandToggle}>{open ? t('common.hide') : t('common.show')}</Text>
      </TouchableOpacity>
      {open ? <Text style={styles.body}>{text}</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    body: {
      color: theme.palette.pearl,
      ...theme.typography.body,
    },
    muted: {
      color: theme.palette.titanium,
      ...theme.typography.caption,
      marginTop: theme.spacing.xs,
    },
    timingLabel: {
      color: theme.palette.silver,
      ...theme.typography.caption,
      marginTop: theme.spacing.xs,
    },
    unlockText: {
      marginTop: theme.spacing.xs,
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
