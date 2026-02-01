import LottieView from 'lottie-react-native';
import { type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

import type { OverlayEffect } from '@utils/giftEffects';
import { canRenderLottie, isLottieJsonUrl } from '@utils/lottieGuard';

type Props = {
  effect?: OverlayEffect;
  borderRadius?: number;
};

export function GiftOverlayEffect({ effect, borderRadius = 0 }: Props) {
  const animationUrl = effect?.animationUrl;
  const isLottieUrl = isLottieJsonUrl(animationUrl);
  const lottieSupported = canRenderLottie();
  if (!effect || !animationUrl || !isLottieUrl || !lottieSupported) {
    if (__DEV__ && effect && animationUrl && isLottieUrl && !lottieSupported) {
      console.debug('[GiftOverlayEffect] Lottie unsupported, skipping overlay.');
    }
    return null;
  }
  const opacity = typeof effect.opacity === 'number' ? effect.opacity : 0.9;
  const zIndex = typeof effect.zIndex === 'number' ? effect.zIndex : 5;
  const scale = typeof effect.scale === 'number' ? effect.scale : 1;
  const loop = effect.loop !== false;
  const resizeMode = effect.fit === 'contain' ? 'contain' : 'cover';
  const Lottie = LottieView as unknown as ComponentType<any>;

  const clipStyle = effect.clipToBounds
    ? { overflow: 'hidden' as const, borderRadius }
    : undefined;

  return (
    <View style={[styles.overlay, { zIndex }, clipStyle]} pointerEvents="none">
      <Lottie
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
