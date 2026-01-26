import { Animated, StyleSheet, View } from 'react-native';
import { useEffect, useMemo, useRef } from 'react';

import type { GiftType } from '@api/gifts';
import type { GiftPreview } from '@utils/gifts';
import { GiftMedia } from './GiftMedia';
import { getGiftThemeTier } from './giftTheme';

type GiftLike = GiftType | GiftPreview;

type Props = {
  visible: boolean;
  gift: GiftLike | null;
  burstKey?: number;
  onComplete?: () => void;
};

export function GiftBurstOverlay({ visible, gift, burstKey, onComplete }: Props) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const tier = gift ? getGiftThemeTier(gift) : 'standard';

  const glowColor = useMemo(() => {
    switch (tier) {
      case 'legendary':
        return 'rgba(250, 204, 21, 0.5)';
      case 'premium':
        return 'rgba(56, 189, 248, 0.45)';
      default:
        return 'rgba(148,163,184,0.35)';
    }
  }, [tier]);

  useEffect(() => {
    if (!visible || !gift) {
      return;
    }
    scale.setValue(0.6);
    opacity.setValue(0);
    glow.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
          tension: 120,
        }),
        Animated.timing(glow, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        onComplete?.();
      }
    });
  }, [burstKey, gift, glow, onComplete, opacity, scale, visible]);

  if (!visible || !gift) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.glow,
          {
            borderColor: glowColor,
            opacity: glow,
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.2] }) }],
          },
        ]}
      />
      <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
        <GiftMedia gift={gift} size="md" renderMode="burst" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    backgroundColor: 'rgba(15,23,42,0.12)',
  },
});
