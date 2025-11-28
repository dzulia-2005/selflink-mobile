import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { MentorInsightCard } from '@schemas/feed';
import { theme } from '@theme';

import { useEntranceAnimation, usePressScaleAnimation } from '../styles/animations';

type Props = {
  data: MentorInsightCard;
};

function MentorFeedCardComponent({ data }: Props) {
  const navigation = useNavigation<any>();
  const tabNavigation = navigation.getParent();
  const entrance = useEntranceAnimation();
  const pressAnim = usePressScaleAnimation(0.985);

  const handlePress = useCallback(() => {
    const params = { screen: 'MentorHome' };
    if (tabNavigation) {
      tabNavigation.navigate('Mentor', params);
      return;
    }
    navigation.navigate('Mentor', params);
  }, [navigation, tabNavigation]);

  return (
    <Animated.View style={[styles.wrapper, entrance.style]}>
      <Animated.View style={[styles.card, pressAnim.style]}>
        <LinearGradient
          colors={theme.gradients.mentorGold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.border}
        >
          <View style={styles.inner}>
            <View style={styles.sparkleRow}>
              <View style={styles.spark} />
              <Text style={styles.label}>Mentor Insight</Text>
              <View style={styles.spark} />
            </View>
            <Text style={styles.title}>{data.title}</Text>
            {data.subtitle ? <Text style={styles.subtitle}>{data.subtitle}</Text> : null}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handlePress}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaText}>{data.cta ?? 'Open mentor'}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

export const MentorFeedCard = memo(MentorFeedCardComponent);

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
    color: '#FCD34D',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
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
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  spark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(252,211,77,0.6)',
  },
  ctaButton: {
    marginTop: 14,
    backgroundColor: '#FBBF24',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#0B1120',
    fontWeight: '700',
  },
});
