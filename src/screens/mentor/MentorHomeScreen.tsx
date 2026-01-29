import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useMemo } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { MentorStackParamList } from '@navigation/types';
import { useTheme, type Theme } from '@theme';

export function MentorHomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MentorStackParamList, 'MentorHome'>>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: theme.spacing.xl + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Mentor</Text>
        <Text style={styles.subtitle}>
          Access your astro mentor, daily guidance, and SoulMatch insights.
        </Text>

        <MetalPanel glow>
          <Text style={styles.cardTitle}>Build your natal chart</Text>
          <Text style={styles.cardText}>
            Use your saved registration birth details or edit them before generating your
            chart.
          </Text>
          <MetalButton
            title="Birth Data Options"
            onPress={() => navigation.navigate('BirthData')}
          />
          <MetalButton
            title="View Natal Chart"
            onPress={() => navigation.navigate('NatalChart')}
          />
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.cardTitle}>AI Mentor Chat</Text>
          <Text style={styles.cardText}>
            Talk to your mentor with session-aware chat and keep your history in one
            place.
          </Text>
          <MetalButton
            title="Open Mentor Chat"
            onPress={() => navigation.navigate('MentorChat')}
          />
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.cardTitle}>AI Mentor Readings</Text>
          <MetalButton
            title="Natal Mentor"
            onPress={() => navigation.navigate('NatalMentor')}
          />
          <MetalButton
            title="Daily Mentor"
            onPress={() => navigation.navigate('DailyMentor')}
          />
        </MetalPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
  },
  container: {
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
