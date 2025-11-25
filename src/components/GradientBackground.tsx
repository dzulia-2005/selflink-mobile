import { LinearGradient } from 'expo-linear-gradient';
import React, { ReactNode } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

import type { ColorValue } from 'react-native';

type Props = {
  colors: Readonly<[ColorValue, ColorValue, ...ColorValue[]]>;
  style?: ViewStyle | ViewStyle[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  children?: ReactNode;
  opacity?: number;
};

export const GradientBackground = ({
  colors,
  style,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  children,
  opacity = 1,
}: Props) => {
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[styles.gradient, style, { opacity }]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 24,
    overflow: 'hidden',
  },
});
