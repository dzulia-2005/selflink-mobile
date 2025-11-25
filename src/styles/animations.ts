import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export const usePressScaleAnimation = (scaleTo = 0.98) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.timing(scale, {
      toValue: value,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlers = useMemo(
    () => ({
      onPressIn: () => animateTo(scaleTo),
      onPressOut: () => animateTo(1),
      style: [{ transform: [{ scale }] }],
    }),
    [scale, scaleTo],
  );

  return handlers;
};

export const useEntranceAnimation = (delay = 0) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translate, {
        toValue: 0,
        delay,
        damping: 18,
        stiffness: 220,
        mass: 0.6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translate]);

  return {
    style: {
      opacity,
      transform: [{ translateY: translate }],
    },
  };
};
