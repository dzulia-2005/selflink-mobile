import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { SoulMatchStackParamList } from '@navigation/types';
import { theme } from '@theme/index';

export function SoulMatchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SoulMatchStackParamList>>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.headline}>SoulMatch</Text>
        <Text style={styles.subtitle}>
          Explore your top matches, detailed compatibility, and mentor guidance.
        </Text>

        <MetalPanel glow>
          <Text style={styles.panelTitle}>Recommendations</Text>
          <Text style={styles.cardText}>
            Browse suggested matches sorted by compatibility.
          </Text>
          <MetalButton
            title="View Recommendations"
            onPress={() => navigation.navigate('SoulMatchRecommendations')}
          />
        </MetalPanel>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  headline: {
    color: theme.palette.platinum,
    ...theme.typography.title,
  },
  subtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  panelTitle: {
    color: theme.palette.titanium,
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.sm,
  },
  cardText: {
    color: theme.palette.silver,
    ...theme.typography.body,
    marginBottom: theme.spacing.sm,
  },
});
