import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AstroWheel, PLANET_COLORS } from '@components/astro/AstroWheel';
import {
  AspectsCard,
  CoreIdentityCard,
  ElementBalanceCard,
  HousesCard,
  KeyAnglesCard,
  PlanetLegend,
  PlanetsCard,
  SelectedPlanetCard,
} from '@components/astro/natal/NatalCards';
import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { ErrorView, LoadingView } from '@components/StateViews';
import { MentorStackParamList } from '@navigation/types';
import { Aspect, NatalChart, PlanetPosition } from '@schemas/astro';
import { getMyNatalChart } from '@services/api/astro';
import { useTheme, type Theme } from '@theme';

const BASE_PLANET_ORDER = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

const SIGN_ELEMENT: Record<string, string> = {
  aries: 'Fire',
  leo: 'Fire',
  sagittarius: 'Fire',
  taurus: 'Earth',
  virgo: 'Earth',
  capricorn: 'Earth',
  gemini: 'Air',
  libra: 'Air',
  aquarius: 'Air',
  cancer: 'Water',
  scorpio: 'Water',
  pisces: 'Water',
};

const formatPlacement = (placement?: {
  lon?: number;
  cusp_lon?: number;
  sign?: string;
}) => {
  if (!placement?.sign) {
    return '—';
  }
  const lon = typeof placement.lon === 'number' ? placement.lon : placement.cusp_lon;
  if (typeof lon !== 'number') {
    return placement.sign;
  }
  const withinSign = Math.round(((((lon % 30) + 30) % 30) + Number.EPSILON) * 10) / 10;
  return `${placement.sign} ${withinSign}°`;
};

const retrogradeTag = (placement?: PlanetPosition | undefined) => {
  if (typeof placement?.speed !== 'number') {
    return null;
  }
  return placement.speed < 0 ? 'R' : null;
};

const resolveHouseForLongitude = (
  houses: Record<string, { cusp_lon: number; sign?: string }>,
  lon?: number,
) => {
  if (typeof lon !== 'number') {
    return null;
  }
  const entries = Object.entries(houses);
  if (entries.length === 0) {
    return null;
  }
  const sorted = entries
    .map(([key, house]) => ({ key, lon: ((house.cusp_lon % 360) + 360) % 360 }))
    .sort((a, b) => a.lon - b.lon);
  const target = ((lon % 360) + 360) % 360;
  let chosen = sorted[sorted.length - 1];
  for (const house of sorted) {
    if (target >= house.lon) {
      chosen = house;
    }
  }
  return `House ${chosen.key}`;
};

const summarizeAspect = (aspect: Aspect) => {
  const primary =
    typeof aspect.planet1 === 'string'
      ? aspect.planet1
      : typeof aspect.p1 === 'string'
        ? aspect.p1
        : typeof aspect.body1 === 'string'
          ? aspect.body1
          : undefined;
  const secondary =
    typeof aspect.planet2 === 'string'
      ? aspect.planet2
      : typeof aspect.p2 === 'string'
        ? aspect.p2
        : typeof aspect.body2 === 'string'
          ? aspect.body2
          : undefined;
  const aspectName =
    typeof aspect.aspect === 'string'
      ? aspect.aspect
      : typeof aspect.type === 'string'
        ? aspect.type
        : typeof aspect.name === 'string'
          ? aspect.name
          : undefined;
  const orbValue =
    typeof aspect.orb === 'number'
      ? aspect.orb
      : typeof aspect.orb_deg === 'number'
        ? aspect.orb_deg
        : undefined;
  const orbText =
    typeof orbValue === 'number' ? `${Math.abs(orbValue).toFixed(1)}° orb` : undefined;
  const labelParts = [primary, aspectName, secondary].filter(Boolean) as string[];
  const label =
    labelParts.length > 0 ? labelParts.join(' ') : JSON.stringify(aspect).slice(0, 80);
  return { label, orbText };
};

type NatalChartScreenProps = {
  prefetchedChart?: NatalChart | null;
  skipAutoFetch?: boolean;
};

export function NatalChartScreen({
  prefetchedChart = null,
  skipAutoFetch = false,
}: NatalChartScreenProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<MentorStackParamList, 'NatalChart'>>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [chart, setChart] = useState<NatalChart | null>(prefetchedChart);
  const [loading, setLoading] = useState(!prefetchedChart);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);

  const planets = useMemo(() => chart?.planets ?? {}, [chart]);
  const houses = useMemo(() => chart?.houses ?? {}, [chart]);
  const aspects = useMemo(() => chart?.aspects ?? [], [chart]);

  const loadChart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyNatalChart();
      setChart(data);
      setSelectedPlanet(null);
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
    if (skipAutoFetch) {
      setLoading(false);
      return;
    }
    loadChart().catch(() => undefined);
  }, [loadChart, skipAutoFetch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChart();
    setRefreshing(false);
  }, [loadChart]);

  const orderedPlanets = useMemo(() => {
    const presentKeys = Object.keys(planets);
    const primary = BASE_PLANET_ORDER.filter((key) => presentKeys.includes(key));
    const extra = presentKeys.filter((key) => !BASE_PLANET_ORDER.includes(key)).sort();
    return [...primary, ...extra];
  }, [planets]);

  const elementBalance = useMemo(() => {
    const counts: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    Object.values(planets).forEach((placement) => {
      const signKey = placement.sign?.toLowerCase();
      const element = signKey ? SIGN_ELEMENT[signKey] : null;
      if (element) {
        counts[element] += 1;
      }
    });
    return Object.entries(counts).map(([element, count]) => ({ element, count }));
  }, [planets]);

  const selectedPlacement = selectedPlanet ? planets[selectedPlanet] : undefined;
  const selectedHouse =
    selectedPlanet && selectedPlacement
      ? resolveHouseForLongitude(houses, selectedPlacement.lon)
      : null;

  const planetLegendKeys = useMemo(
    () => orderedPlanets.filter((key) => PLANET_COLORS[key.toLowerCase()] !== undefined),
    [orderedPlanets],
  );

  if (loading) {
    return <LoadingView message="Loading your natal chart…" />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorBlock}>
          <ErrorView
            message={error}
            actionLabel="Try again"
            onRetry={() => loadChart().catch(() => undefined)}
          />
          <MetalButton
            title="Update Birth Data"
            onPress={() => navigation.navigate('BirthData')}
          />
        </View>
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
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.headline}>My Natal Chart</Text>
            <Text style={styles.subtitle}>
              Your Sun, Moon, Ascendant and planets form the core roadmap of your
              personality. Update birth data anytime to refresh.
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Refresh natal chart"
            onPress={() => handleRefresh().catch(() => undefined)}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh" size={22} color={theme.palette.platinum} />
          </TouchableOpacity>
        </View>

        <MetalPanel glow style={styles.chartPanel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Chart Wheel</Text>
            <Text style={styles.sectionDescription}>
              Tap a planet to highlight it. Colors match the legend below.
            </Text>
          </View>
          <View style={styles.wheelWrapper}>
            <AstroWheel
              planets={planets}
              houses={houses}
              selectedPlanet={selectedPlanet}
              onSelectPlanet={setSelectedPlanet}
              size={320}
            />
          </View>
        </MetalPanel>

        <SelectedPlanetCard
          planetKey={selectedPlanet}
          placement={selectedPlacement}
          houseLabel={selectedHouse}
          formatPlacement={formatPlacement}
          retrogradeTag={retrogradeTag}
        />

        <PlanetLegend planetKeys={planetLegendKeys} />

        <CoreIdentityCard
          placements={[
            { label: 'Sun', placement: planets.sun },
            { label: 'Moon', placement: planets.moon },
            {
              label: 'Ascendant',
              placement: houses['1']
                ? { lon: houses['1'].cusp_lon, sign: houses['1'].sign }
                : undefined,
            },
          ]}
          formatPlacement={formatPlacement}
        />

        <KeyAnglesCard houses={houses} formatPlacement={formatPlacement} />

        <PlanetsCard
          planets={planets}
          orderedKeys={orderedPlanets}
          formatPlacement={formatPlacement}
          getHouseLabel={(key) => resolveHouseForLongitude(houses, planets[key]?.lon)}
          retrogradeTag={retrogradeTag}
        />

        <HousesCard houses={houses} formatPlacement={formatPlacement} />

        <AspectsCard
          aspects={aspects}
          renderAspect={(aspect) => {
            const { label, orbText } = summarizeAspect(aspect);
            return (
              <View>
                <Text style={styles.aspectTitle}>{label}</Text>
                {orbText ? <Text style={styles.aspectMeta}>{orbText}</Text> : null}
              </View>
            );
          }}
        />

        <ElementBalanceCard elements={elementBalance} />

        <MetalButton
          title="Update Birth Data"
          onPress={() => navigation.navigate('BirthData')}
        />

        {chart.calculated_at ? (
          <Text style={styles.footnote}>
            Generated at {new Date(chart.calculated_at).toLocaleString()}
          </Text>
        ) : null}
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
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  titleBlock: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  headline: {
    color: theme.palette.platinum,
    ...theme.typography.headingL,
    textShadowColor: theme.palette.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  refreshButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.palette.titanium,
    backgroundColor: theme.palette.obsidian,
  },
  chartPanel: {
    borderColor: theme.palette.glow,
    borderWidth: 1,
  },
  sectionHeader: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    color: theme.palette.platinum,
    ...theme.typography.headingM,
  },
  sectionDescription: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  wheelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  aspectTitle: {
    color: theme.palette.platinum,
    ...theme.typography.body,
  },
  aspectMeta: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    marginTop: 2,
  },
  footnote: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  errorBlock: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
});
