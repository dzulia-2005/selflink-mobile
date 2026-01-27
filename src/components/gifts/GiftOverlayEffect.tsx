import { StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import LottieView from 'lottie-react-native';

import type { OverlayEffect } from '@utils/giftEffects';

type Props = {
  effect?: OverlayEffect;
  borderRadius?: number;
};

export function GiftOverlayEffect({ effect, borderRadius = 0 }: Props) {
  const animationUrl = effect?.animationUrl;
  if (!effect || !animationUrl) {
    return null;
  }
  const opacity = typeof effect.opacity === 'number' ? effect.opacity : 0.9;
  const zIndex = typeof effect.zIndex === 'number' ? effect.zIndex : 5;
  const scale = typeof effect.scale === 'number' ? effect.scale : 1;
  const loop = effect.loop !== false;
  const resizeMode = effect.fit === 'contain' ? 'contain' : 'cover';

  const clipStyle = useMemo(
    () =>
      effect.clipToBounds
        ? { overflow: 'hidden' as const, borderRadius }
        : undefined,
    [borderRadius, effect.clipToBounds],
  );

  return (
    <View style={[styles.overlay, { zIndex }, clipStyle]} pointerEvents="none">
      <LottieView
        source={{ uri: animationUrl }}
        autoPlay
        loop={loop}
        resizeMode={resizeMode}
        style={[StyleSheet.absoluteFillObject, { opacity, transform: [{ scale }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
