import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalPanel } from '@components/MetalPanel';
import { theme } from '@theme/index';

const sampleTraits = [
  'Celestial Alignment: 82% resonance',
  'Mentor Affinity: 75% shared growth paths',
  'Community Harmony: 68% shared circles',
];

export function SoulMatchScreen() {
  const traitRows = useMemo(
    () => sampleTraits.map((trait) => ({ id: trait, trait })),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headline}>SoulMatch Insights</Text>
        <Text style={styles.subtitle}>
          Elegant gradients, rounded panels, and carefully tuned copy—not just a
          compatibility score, but a story about your next connection.
        </Text>

        <MetalPanel glow>
          <Text style={styles.panelTitle}>Today&apos;s Spotlight</Text>
          {traitRows.map((row) => (
            <View key={row.id} style={styles.traitRow}>
              <View style={styles.traitBullet} />
              <Text style={styles.traitText}>{row.trait}</Text>
            </View>
          ))}
          <Text style={styles.footer}>
            Pull real data by wiring to /api/v1/soulmatch/.
          </Text>
        </MetalPanel>
      </ScrollView>
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
    marginBottom: theme.spacing.md,
  },
  traitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  traitBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.palette.glow,
  },
  traitText: {
    color: theme.palette.titanium,
    ...theme.typography.body,
  },
  footer: {
    marginTop: theme.spacing.md,
    color: theme.palette.silver,
    fontStyle: 'italic',
  },
});
