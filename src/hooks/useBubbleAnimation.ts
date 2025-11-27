import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export function useBubbleAnimation(isOwn: boolean) {
  const scale = useRef(new Animated.Value(isOwn ? 0.94 : 0.98)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (hasAnimatedRef.current) {
      return;
    }
    hasAnimatedRef.current = true;
    if (isOwn) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 130,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOwn, opacity, scale]);

  return {
    animatedStyle: {
      transform: [{ scale }],
      opacity,
    },
  };
}
