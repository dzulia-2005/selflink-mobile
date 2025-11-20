import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { AstroWheel } from '@components/astro/AstroWheel';
import { ErrorView, LoadingView } from '@components/StateViews';
import { MentorStackParamList } from '@navigation/types';
import { getMyNatalChart } from '@services/api/astro';
import { NatalChart, PlanetPosition } from '@schemas/astro';
import { theme } from '@theme/index';

type PlacementRowProps = {
  label: string;
  data?: PlanetPosition;
};

function PlacementRow({ label, data }: PlacementRowProps) {
  const value = data?.sign
    ? `${data.sign} ${Math.round(((data.lon ?? 0) % 30) * 10) / 10}°`
    : '—';
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function NatalChartScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MentorStackParamList, 'NatalChart'>>();
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadChart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyNatalChart();
      setChart(data);
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('(404)')
          ? 'No natal chart found. Please enter your birth data first.'
          : 'Unable to load natal chart.';
      setError(message);
      setChart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChart().catch(() => undefined);
  }, [loadChart]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChart();
    setRefreshing(false);
  }, [loadChart]);

  if (loading) {
    return <LoadingView message="Loading your natal chart…" />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorView
          message={error}
          onRetry={() => navigation.navigate('BirthData')}
        />
      </SafeAreaView>
    );
  }

  if (!chart) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorView
          message="No natal chart yet."
          onRetry={() => navigation.navigate('BirthData')}
        />
      </SafeAreaView>
    );
  }

  const planets = chart.planets || {};
  const houses = chart.houses || {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.palette.platinum}
          />
        }
      >
        <Text style={styles.headline}>My Natal Chart</Text>
        <Text style={styles.subtitle}>
          Sun, Moon, and Ascendant define your core identity roadmap. Refresh anytime after
          updating birth data.
        </Text>

        <MetalPanel glow>
          <Text style={styles.sectionTitle}>Core Identity</Text>
          <PlacementRow label="Sun" data={planets.sun} />
          <PlacementRow label="Moon" data={planets.moon} />
          <PlacementRow
            label="Ascendant"
            data={houses['1'] ? { lon: houses['1'].cusp_lon, sign: houses['1'].sign } : undefined}
          />
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.sectionTitle}>Chart Wheel</Text>
          <AstroWheel planets={planets} houses={houses} />
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.sectionTitle}>Planets</Text>
          <PlacementRow label="Mercury" data={planets.mercury} />
          <PlacementRow label="Venus" data={planets.venus} />
          <PlacementRow label="Mars" data={planets.mars} />
          <PlacementRow label="Jupiter" data={planets.jupiter} />
          <PlacementRow label="Saturn" data={planets.saturn} />
          <PlacementRow label="Uranus" data={planets.uranus} />
          <PlacementRow label="Neptune" data={planets.neptune} />
          <PlacementRow label="Pluto" data={planets.pluto} />
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.sectionTitle}>Houses</Text>
          {Object.entries(houses).map(([houseNum, placement]) => (
            <PlacementRow
              key={houseNum}
              label={`House ${houseNum}`}
              data={{ lon: placement.cusp_lon, sign: placement.sign }}
            />
          ))}
        </MetalPanel>

        <MetalButton
          title="Update Birth Data"
          onPress={() => navigation.navigate('BirthData')}
        />
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
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  headline: {
    color: theme.palette.platinum,
    ...theme.typography.headingL,
  },
  subtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  sectionTitle: {
    color: theme.palette.titanium,
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  rowLabel: {
    color: theme.palette.platinum,
    ...theme.typography.body,
  },
  rowValue: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
});
