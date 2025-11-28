import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { MatrixInsightCard } from '@schemas/feed';
import { theme } from '@theme';

import { useEntranceAnimation, usePressScaleAnimation } from '../styles/animations';

type Props = {
  data: MatrixInsightCard;
};

function MatrixFeedCardComponent({ data }: Props) {
  const navigation = useNavigation<any>();
  const tabNavigation = navigation.getParent();
  const entrance = useEntranceAnimation();
  const pressAnim = usePressScaleAnimation(0.985);

  const handlePress = useCallback(() => {
    const params = { screen: 'SoulMatchHome' };
    if (tabNavigation) {
      tabNavigation.navigate('SoulMatch', params);
      return;
    }
    navigation.navigate('SoulMatch', params);
  }, [navigation, tabNavigation]);

  return (
    <Animated.View style={[styles.wrapper, entrance.style]}>
      <Animated.View style={[styles.card, pressAnim.style]}>
        <LinearGradient
          colors={theme.gradients.matrixGlow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.border}
        >
          <View style={styles.inner}>
            <View style={styles.orb} />
            <Text style={styles.label}>Matrix Insight</Text>
            <Text style={styles.title}>{data.title}</Text>
            {data.subtitle ? <Text style={styles.subtitle}>{data.subtitle}</Text> : null}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handlePress}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaText}>{data.cta ?? 'View matrix'}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

export const MatrixFeedCard = memo(MatrixFeedCardComponent);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  border: {
    padding: 1.5,
    borderRadius: 20,
  },
  inner: {
    backgroundColor: theme.feed.cardBackground,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.feed.cardBorder,
  },
  label: {
    color: '#22C55E',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.feed.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    color: theme.feed.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  orb: {
    position: 'absolute',
    right: 16,
    top: 12,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34,197,94,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  ctaButton: {
    marginTop: 14,
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#0B1120',
    fontWeight: '700',
  },
});
