import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SkeletonShimmer } from './SkeletonShimmer';

export const InsightSkeleton = () => {
  return (
    <View style={styles.card}>
      <SkeletonShimmer width={90} height={10} borderRadius={6} />
      <View style={styles.spacer} />
      <SkeletonShimmer width="70%" height={14} borderRadius={8} />
      <View style={styles.spacer} />
      <SkeletonShimmer width="85%" height={10} borderRadius={6} />
      <View style={styles.ctaSpacer} />
      <SkeletonShimmer width="40%" height={12} borderRadius={10} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0B1120',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 14,
  },
  spacer: {
    height: 10,
  },
  ctaSpacer: {
    height: 14,
  },
});
