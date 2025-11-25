import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export const useShimmer = (duration = 1200) => {
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [duration, translateX]);

  return translateX;
};
