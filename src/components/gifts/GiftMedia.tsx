import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useMemo, useState, type ComponentType } from 'react';
import LottieView from 'lottie-react-native';

import type { GiftType } from '@api/gifts';
import type { GiftPreview } from '@utils/gifts';
import { theme } from '@theme';

import { getGiftThemeTier } from './giftTheme';

type GiftLike = GiftType | GiftPreview;

export type GiftMediaSize = 'sm' | 'md' | 'lg';
export type GiftMediaRenderMode = 'thumbnail' | 'preview' | 'burst';

type GiftMediaProps = {
  gift: GiftLike;
  size?: GiftMediaSize;
  showLabel?: boolean;
  renderMode?: GiftMediaRenderMode;
  style?: ViewStyle;
};

type GiftMediaInfo = {
  url: string | null;
  animated: boolean;
};

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|$)/i;
const ANIMATED_IMAGE_EXT = /\.(gif|webp)(\?|$)/i;
const LOTTIE_EXT = /\.(json|lottie)(\?|$)/i;

const extractMedia = (gift: GiftLike) => {
  const record = gift as GiftType & GiftPreview;
  return {
    mediaUrl:
      record.media_url ??
      record.mediaUrl ??
      record.art_url ??
      (record as GiftPreview).artUrl ??
      null,
    animationUrl: record.animation_url ?? record.animationUrl ?? null,
    kind: record.kind,
  };
};

export const getGiftPrimaryMedia = (gift: GiftLike): GiftMediaInfo => {
  const { mediaUrl, animationUrl, kind } = extractMedia(gift);
  const isAnimatedKind = kind === 'animated';
  if (animationUrl) {
    if (LOTTIE_EXT.test(animationUrl)) {
      if (mediaUrl) {
        return { url: mediaUrl, animated: false };
      }
      return { url: null, animated: isAnimatedKind };
    }
    if (!VIDEO_EXT.test(animationUrl)) {
      const animated = isAnimatedKind || ANIMATED_IMAGE_EXT.test(animationUrl);
      return { url: animationUrl, animated };
    }
    if (mediaUrl) {
      return { url: mediaUrl, animated: false };
    }
    return { url: null, animated: isAnimatedKind };
  }
  if (mediaUrl) {
    return { url: mediaUrl, animated: isAnimatedKind };
  }
  return { url: null, animated: isAnimatedKind };
};

export const isAnimatedGift = (gift: GiftLike) => {
  const { animationUrl, kind } = extractMedia(gift);
  return kind === 'animated' || Boolean(animationUrl);
};

const sizeMap: Record<GiftMediaSize, number> = {
  sm: 48,
  md: 72,
  lg: 110,
};

export function GiftMedia({
  gift,
  size = 'md',
  showLabel,
  renderMode = 'thumbnail',
  style,
}: GiftMediaProps) {
  const [error, setError] = useState(false);
  const [lottieError, setLottieError] = useState(false);
  const { url } = useMemo(() => getGiftPrimaryMedia(gift), [gift]);
  const { animationUrl, kind } = useMemo(() => extractMedia(gift), [gift]);
  const dimension = sizeMap[size];
  const tier = getGiftThemeTier(gift);
  const allowAnimation = kind === 'animated' || Boolean(animationUrl);
  const useLottie =
    allowAnimation &&
    Boolean(animationUrl) &&
    !lottieError &&
    LOTTIE_EXT.test(animationUrl ?? '') &&
    renderMode !== 'thumbnail';

  const frameStyle = useMemo(() => {
    switch (tier) {
      case 'legendary':
        return {
          borderColor: 'rgba(250, 204, 21, 0.8)',
          shadowColor: 'rgba(250, 204, 21, 0.7)',
        };
      case 'premium':
        return {
          borderColor: 'rgba(56, 189, 248, 0.7)',
          shadowColor: 'rgba(56, 189, 248, 0.6)',
        };
      default:
        return {
          borderColor: 'rgba(148,163,184,0.35)',
          shadowColor: 'rgba(148,163,184,0.4)',
        };
    }
  }, [tier]);

  const Lottie = LottieView as unknown as ComponentType<any>;

  return (
    <View style={[styles.wrapper, frameStyle, style]}>
      <View style={styles.mediaWrap}>
        {useLottie && animationUrl ? (
          <Lottie
            source={{ uri: animationUrl }}
            autoPlay
            loop
            style={{ width: dimension, height: dimension }}
            onAnimationFinish={() => {}}
            onError={() => setLottieError(true)}
          />
        ) : url && !error ? (
          <Image
            source={{ uri: url }}
            style={{ width: dimension, height: dimension, borderRadius: dimension / 4 }}
            resizeMode="cover"
            onError={() => setError(true)}
          />
        ) : (
          <View style={[styles.placeholder, { width: dimension, height: dimension }]}>
            <Text style={styles.placeholderText}>★</Text>
          </View>
        )}
      </View>
      {showLabel && (gift as GiftType).name ? (
        <Text style={styles.label} numberOfLines={1}>
          {(gift as GiftType).name}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mediaWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.2)',
  },
  placeholderText: {
    color: theme.reels.textPrimary,
    fontSize: 24,
  },
  label: {
    marginTop: 6,
    color: theme.reels.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
});
