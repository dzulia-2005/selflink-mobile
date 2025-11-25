import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SkeletonShimmer } from './SkeletonShimmer';

export const SoulMatchSkeleton = () => {
  return (
    <View style={styles.card}>
      <SkeletonShimmer width={80} height={10} borderRadius={6} />
      <View style={styles.spacer} />
      <SkeletonShimmer width="72%" height={14} borderRadius={8} />
      <View style={styles.spacer} />
      <SkeletonShimmer width="82%" height={10} borderRadius={6} />
      <View style={styles.avatarRow}>
        <SkeletonShimmer width={48} height={48} borderRadius={24} />
        <SkeletonShimmer width={48} height={48} borderRadius={24} />
        <SkeletonShimmer width={48} height={48} borderRadius={24} />
      </View>
      <View style={styles.ctaSpacer} />
      <SkeletonShimmer width="50%" height={12} borderRadius={10} />
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
    height: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  ctaSpacer: {
    height: 12,
  },
});
