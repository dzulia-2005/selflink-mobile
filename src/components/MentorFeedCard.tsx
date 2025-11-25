import { useNavigation } from '@react-navigation/native';
import { memo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { MentorInsightCard } from '@schemas/feed';

type Props = {
  data: MentorInsightCard;
};

function MentorFeedCardComponent({ data }: Props) {
  const navigation = useNavigation<any>();
  const tabNavigation = navigation.getParent();

  const handlePress = useCallback(() => {
    const params = { screen: 'MentorHome' };
    if (tabNavigation) {
      tabNavigation.navigate('Mentor', params);
      return;
    }
    navigation.navigate('Mentor', params);
  }, [navigation, tabNavigation]);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Mentor Insight</Text>
      <Text style={styles.title}>{data.title}</Text>
      {data.subtitle ? <Text style={styles.subtitle}>{data.subtitle}</Text> : null}
      <TouchableOpacity style={styles.ctaButton} onPress={handlePress} activeOpacity={0.9}>
        <Text style={styles.ctaText}>{data.cta ?? 'Open mentor'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export const MentorFeedCard = memo(MentorFeedCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0B1120',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  label: {
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 20,
  },
  ctaButton: {
    marginTop: 14,
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#0B1120',
    fontWeight: '700',
  },
});
