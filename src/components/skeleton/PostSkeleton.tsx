import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SkeletonShimmer } from './SkeletonShimmer';

type Props = {
  hasMedia?: boolean;
};

export const PostSkeleton = ({ hasMedia = true }: Props) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <SkeletonShimmer width={48} height={48} borderRadius={24} />
        <View style={styles.headerText}>
          <SkeletonShimmer width={140} height={12} borderRadius={8} />
          <View style={styles.spacer} />
          <SkeletonShimmer width={90} height={10} borderRadius={6} />
        </View>
      </View>
      <View style={styles.body}>
        <SkeletonShimmer width="100%" height={12} borderRadius={8} />
        <View style={styles.spacer} />
        <SkeletonShimmer width="85%" height={12} borderRadius={8} />
        {hasMedia ? (
          <>
            <View style={styles.spacer} />
            <SkeletonShimmer width="100%" height={180} borderRadius={16} />
          </>
        ) : null}
      </View>
      <View style={styles.footer}>
        <SkeletonShimmer width="30%" height={12} borderRadius={8} />
        <SkeletonShimmer width="35%" height={12} borderRadius={8} />
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  body: {
    marginTop: 14,
    gap: 6,
  },
  footer: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  spacer: {
    height: 8,
  },
});
