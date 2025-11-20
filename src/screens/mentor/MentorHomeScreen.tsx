import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { MentorStackParamList } from '@navigation/types';
import { theme } from '@theme/index';

export function MentorHomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MentorStackParamList, 'MentorHome'>>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mentor</Text>
      <Text style={styles.subtitle}>
        Access your astro mentor, daily guidance, and SoulMatch insights.
      </Text>

      <MetalPanel glow>
        <Text style={styles.cardTitle}>Build your natal chart</Text>
        <Text style={styles.cardText}>
          Precise birth data powers your natal mentor and daily guidance.
        </Text>
        <MetalButton
          title="Enter Birth Data"
          onPress={() => navigation.navigate('BirthData')}
        />
        <MetalButton
          title="View Natal Chart"
          onPress={() => navigation.navigate('NatalChart')}
        />
      </MetalPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    color: theme.palette.platinum,
    ...theme.typography.headingL,
  },
  subtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  cardTitle: {
    color: theme.palette.titanium,
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.xs,
  },
  cardText: {
    color: theme.palette.silver,
    ...theme.typography.body,
    marginBottom: theme.spacing.sm,
  },
});
