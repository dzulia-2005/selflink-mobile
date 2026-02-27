import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useTheme, type Theme } from '@theme';
import type { SoulmatchTier } from '@utils/soulmatchUpgradeGate';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.7);
const CLOSE_THRESHOLD = SHEET_HEIGHT * 0.25;
const CLOSE_ICON = '\u2715';
const BULLET_PREFIX = '\u2022';

type Props = {
  visible: boolean;
  selectedTier: Exclude<SoulmatchTier, 'free'>;
  onClose: () => void;
  onSelectTier: (tier: Exclude<SoulmatchTier, 'free'>) => void;
  onContinueFree?: () => void;
  previewText?: string;
};

export function SoulMatchUpgradeSheet({
  visible,
  selectedTier,
  onClose,
  onSelectTier,
  onContinueFree,
  previewText,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const closingRef = useRef(false);
  const tiers = useMemo(
    () => [
      {
        tier: 'free',
        title: t('soulmatch.upgrade.tiers.free.title'),
        subtitle: t('soulmatch.upgrade.tiers.free.subtitle'),
        bullets: [
          t('soulmatch.upgrade.tiers.free.bullets.compatibilityScore'),
          t('soulmatch.upgrade.tiers.free.bullets.keyBadges'),
          t('soulmatch.upgrade.tiers.free.bullets.topMatches'),
        ],
      },
      {
        tier: 'premium',
        title: t('soulmatch.upgrade.tiers.premium.title'),
        subtitle: t('soulmatch.upgrade.tiers.premium.subtitle'),
        bullets: [
          t('soulmatch.upgrade.tiers.premium.bullets.lensExplanations'),
          t('soulmatch.upgrade.tiers.premium.bullets.timingSummary'),
          t('soulmatch.upgrade.tiers.premium.bullets.fullContext'),
        ],
        highlight: t('soulmatch.upgrade.tiers.premium.highlight'),
      },
      {
        tier: 'premium_plus',
        title: t('soulmatch.upgrade.tiers.premiumPlus.title'),
        subtitle: t('soulmatch.upgrade.tiers.premiumPlus.subtitle'),
        bullets: [
          t('soulmatch.upgrade.tiers.premiumPlus.bullets.everythingInPremium'),
          t('soulmatch.upgrade.tiers.premiumPlus.bullets.howToApproach'),
          t('soulmatch.upgrade.tiers.premiumPlus.bullets.strategyNotes'),
        ],
      },
    ] as Array<{
      tier: SoulmatchTier;
      title: string;
      subtitle: string;
      bullets: string[];
      highlight?: string;
    }>,
    [t],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    translateY.setValue(SHEET_HEIGHT);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  const closeSheet = useCallback(() => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      closingRef.current = false;
      onClose?.();
    });
  }, [onClose, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          return Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
        },
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > CLOSE_THRESHOLD || gesture.vy > 1.2) {
            closeSheet();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
            tension: 120,
          }).start();
        },
      }),
    [closeSheet, translateY],
  );

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent visible animationType="none" onRequestClose={closeSheet}>
      <TouchableWithoutFeedback onPress={closeSheet}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_HEIGHT,
            paddingBottom: Math.max(insets.bottom, 12),
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.handleArea} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>{t('soulmatch.upgrade.title')}</Text>
            <Text style={styles.subtitle}>{t('soulmatch.upgrade.subtitle')}</Text>
          </View>
          <TouchableOpacity onPress={closeSheet} hitSlop={10}>
            <Text style={styles.closeLabel}>{CLOSE_ICON}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tierList}>
          {tiers.map((tier) => {
            const isSelected = selectedTier === tier.tier;
            return (
              <MetalPanel
                key={tier.tier}
                glow={tier.tier === 'premium'}
                style={styles.tierCard}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    tier.tier !== 'free'
                      ? onSelectTier(tier.tier as Exclude<SoulmatchTier, 'free'>)
                      : onContinueFree?.()
                  }
                >
                  <View style={styles.tierHeader}>
                    <Text style={styles.tierTitle}>{tier.title}</Text>
                    {tier.highlight ? (
                      <Text style={styles.tierHighlight}>{tier.highlight}</Text>
                    ) : null}
                    {isSelected ? (
                      <Text style={styles.tierSelected}>
                        {t('soulmatch.upgrade.selected')}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.tierSubtitle}>{tier.subtitle}</Text>
                  <View style={styles.tierBullets}>
                    {tier.bullets.map((bullet) => {
                      const bulletLabel = `${BULLET_PREFIX} ${bullet}`;
                      return (
                        <Text key={bullet} style={styles.tierBullet}>
                          {bulletLabel}
                        </Text>
                      );
                    })}
                  </View>
                </TouchableOpacity>
              </MetalPanel>
            );
          })}
        </View>

        <MetalPanel style={styles.previewCard}>
          <Text style={styles.previewTitle}>{t('soulmatch.upgrade.preview.title')}</Text>
          <Text style={styles.previewText} numberOfLines={5}>
            {previewText ||
              t('soulmatch.upgrade.preview.body')}
          </Text>
          <LinearGradient
            colors={['rgba(15,23,42,0)', 'rgba(15,23,42,0.9)']}
            style={styles.previewFade}
          />
        </MetalPanel>

        <View style={styles.ctaBlock}>
          <MetalButton
            title={t('soulmatch.upgrade.actions.unlockPremium')}
            onPress={() => onSelectTier('premium')}
          />
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onSelectTier('premium_plus')}
          >
            <Text style={styles.secondaryButtonText}>
              {t('soulmatch.upgrade.actions.unlockPremiumPlus')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.freeButton} onPress={onContinueFree}>
            <Text style={styles.freeButtonText}>
              {t('soulmatch.upgrade.actions.continueFree')}
            </Text>
          </TouchableOpacity>
          <Text style={styles.microcopy}>{t('soulmatch.upgrade.microcopy')}</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15,23,42,0.98)',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.4)',
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    handleArea: {
      alignItems: 'center',
      paddingVertical: 6,
    },
    handle: {
      width: 42,
      height: 5,
      borderRadius: 999,
      backgroundColor: 'rgba(148,163,184,0.5)',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    headerTextBlock: {
      flex: 1,
    },
    title: {
      color: theme.palette.platinum,
      ...theme.typography.headingM,
    },
    subtitle: {
      color: theme.palette.silver,
      ...theme.typography.body,
      marginTop: 4,
    },
    closeLabel: {
      color: theme.palette.silver,
      fontSize: 18,
    },
    tierList: {
      gap: theme.spacing.sm,
    },
    tierCard: {
      padding: theme.spacing.md,
    },
    tierHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    tierTitle: {
      color: theme.palette.platinum,
      ...theme.typography.subtitle,
    },
    tierHighlight: {
      color: theme.palette.glow,
      ...theme.typography.caption,
    },
    tierSelected: {
      marginLeft: 'auto',
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    tierSubtitle: {
      color: theme.palette.silver,
      ...theme.typography.caption,
      marginTop: 4,
    },
    tierBullets: {
      marginTop: theme.spacing.sm,
      gap: 4,
    },
    tierBullet: {
      color: theme.palette.pearl,
      ...theme.typography.caption,
    },
    previewCard: {
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      overflow: 'hidden',
    },
    previewTitle: {
      color: theme.palette.silver,
      ...theme.typography.caption,
      marginBottom: theme.spacing.xs,
    },
    previewText: {
      color: theme.palette.pearl,
      ...theme.typography.body,
    },
    previewFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 40,
    },
    ctaBlock: {
      marginTop: theme.spacing.md,
    },
    secondaryButton: {
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.palette.glow,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: theme.palette.glow,
      ...theme.typography.button,
    },
    freeButton: {
      marginTop: theme.spacing.sm,
      alignItems: 'center',
    },
    freeButtonText: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    microcopy: {
      marginTop: theme.spacing.sm,
      textAlign: 'center',
      color: theme.palette.titanium,
      ...theme.typography.caption,
    },
  });
