import { useNavigation } from '@react-navigation/native';
import { memo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { MatrixInsightCard } from '@schemas/feed';

type Props = {
  data: MatrixInsightCard;
};

function MatrixFeedCardComponent({ data }: Props) {
  const navigation = useNavigation<any>();
  const tabNavigation = navigation.getParent();

  const handlePress = useCallback(() => {
    const params = { screen: 'SoulMatchHome' };
    if (tabNavigation) {
      tabNavigation.navigate('SoulMatch', params);
      return;
    }
    navigation.navigate('SoulMatch', params);
  }, [navigation, tabNavigation]);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Matrix Insight</Text>
      <Text style={styles.title}>{data.title}</Text>
      {data.subtitle ? <Text style={styles.subtitle}>{data.subtitle}</Text> : null}
      <TouchableOpacity style={styles.ctaButton} onPress={handlePress} activeOpacity={0.9}>
        <Text style={styles.ctaText}>{data.cta ?? 'View matrix'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export const MatrixFeedCard = memo(MatrixFeedCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0B1120',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  label: {
    color: '#22C55E',
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
