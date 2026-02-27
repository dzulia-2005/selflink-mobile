import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshControl,
  ScrollView,
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
import { NatalChart } from '@schemas/astro';
import { getMyNatalChart } from '@services/api/astro';
import { createStyles } from '../styles/index.styles';
import { useTheme } from '@theme';
import { BASE_PLANET_ORDER, NatalChartScreenProps, SIGN_ELEMENT } from '../types/index.types';
import { SummarizeAspect } from '../components/SummarizeAspect';
import { formatPlacement } from '../components/FormatPlacement';
import { retrogradeTag } from '../components/RetrogradeTag';
import { resolveHouseForLongitude } from '../components/ResolveHouseForLongitude';
import NatalChartError from '../components/NatalChartError';


const NatalChartScreen:React.FC = ({
  prefetchedChart = null,
  skipAutoFetch = false,
}: NatalChartScreenProps) => {
  const { t } = useTranslation();
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
          ? t('astro.natal.alerts.notFound')
          : t('astro.natal.alerts.loadFailed');
      setError(message);
      setChart(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

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
    const counts: Record<'fire' | 'earth' | 'air' | 'water', number> = {
      fire: 0,
      earth: 0,
      air: 0,
      water: 0,
    };
    Object.values(planets).forEach((placement) => {
      const signKey = placement.sign?.toLowerCase();
      const element = signKey ? SIGN_ELEMENT[signKey] : undefined;
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
    return <LoadingView message={t('astro.natal.loading')} />;
  }

  if (error) {
    return (
     <NatalChartError
      loadChart={loadChart}
      error={error}
     />
    );
  }

  if (!chart) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorView
          message={t('astro.natal.empty.noChart')}
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
            <Text style={styles.headline}>{t('astro.natal.title')}</Text>
            <Text style={styles.subtitle}>{t('astro.natal.subtitle')}</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel={t('astro.natal.accessibility.refresh')}
            onPress={() => handleRefresh().catch(() => undefined)}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh" size={22} color={theme.palette.platinum} />
          </TouchableOpacity>
        </View>

        <MetalPanel glow style={styles.chartPanel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('astro.natal.chartWheel.title')}</Text>
            <Text style={styles.sectionDescription}>{t('astro.natal.chartWheel.description')}</Text>
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
            { label: t('astro.natal.labels.sun'), placement: planets.sun },
            { label: t('astro.natal.labels.moon'), placement: planets.moon },
            {
              label: t('astro.natal.labels.ascendant'),
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
          getHouseLabel={(key) => {
            const house = resolveHouseForLongitude(houses, planets[key]?.lon);
            return house ? t('astro.natal.labels.house', { number: house }) : null;
          }}
          retrogradeTag={retrogradeTag}
        />

        <HousesCard houses={houses} formatPlacement={formatPlacement} />

        <AspectsCard
          aspects={aspects}
          renderAspect={(aspect) => {
            const { label, orbValue } = SummarizeAspect(aspect);
            return (
              <View>
                <Text style={styles.aspectTitle}>{label}</Text>
                {typeof orbValue === 'number' ? (
                  <Text style={styles.aspectMeta}>
                    {t('astro.natal.labels.orbValue', {
                      value: Math.abs(orbValue).toFixed(1),
                    })}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />

        <ElementBalanceCard elements={elementBalance} />

        <MetalButton
          title={t('astro.natal.actions.updateBirthData')}
          onPress={() => navigation.navigate('BirthData')}
        />

        {chart.calculated_at ? (
          <Text style={styles.footnote}>
            {t('astro.natal.generatedAt', {
              value: new Date(chart.calculated_at).toLocaleString(),
            })}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NatalChartScreen;
