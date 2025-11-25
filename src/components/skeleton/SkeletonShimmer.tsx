import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';

import { useShimmer } from '@hooks/useShimmer';

type Props = {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
};

export const SkeletonShimmer = ({ width, height, borderRadius = 8 }: Props) => {
  const translateX = useShimmer();
  const translate = translateX.interpolate({
    inputRange: [-1, 1],
    outputRange: [-150, 150],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX: translate }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
});
