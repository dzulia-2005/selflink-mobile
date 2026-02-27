import { ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { PLANET_COLORS } from '@components/astro/AstroWheel';
import { MetalPanel } from '@components/MetalPanel';
import { Aspect, HousePosition, PlanetPosition } from '@schemas/astro';
import { useTheme, type Theme } from '@theme';

type SectionPanelProps = {
  title: string;
  children: ReactNode;
  description?: string;
  glow?: boolean;
  action?: ReactNode;
  style?: ViewStyle;
};

type PlacementRowProps = {
  label: string;
  value: string;
  detail?: string;
  tag?: string;
};

type ElementStat = {
  element: string;
  count: number;
};

type PlanetLegendProps = {
  planetKeys: string[];
};

type PlanetsCardProps = {
  planets: Record<string, PlanetPosition>;
  orderedKeys: string[];
  formatPlacement: (placement?: PlanetPosition) => string;
  getHouseLabel?: (planetKey: string) => string | null;
  retrogradeTag?: (placement?: PlanetPosition) => string | null;
};

type HousesCardProps = {
  houses: Record<string, HousePosition>;
  formatPlacement: (placement?: { cusp_lon: number; sign?: string }) => string;
};

type AspectsCardProps = {
  aspects: Aspect[];
  renderAspect: (aspect: Aspect, index: number) => ReactNode;
};

type ElementBalanceCardProps = {
  elements: ElementStat[];
};

type AnglesCardProps = {
  houses: Record<string, HousePosition>;
  formatPlacement: (placement?: { cusp_lon: number; sign?: string }) => string;
};

type SelectedPlanetProps = {
  planetKey: string | null;
  placement?: PlanetPosition;
  houseLabel?: string | null;
  formatPlacement: (placement?: PlanetPosition) => string;
  retrogradeTag?: (placement?: PlanetPosition) => string | null;
};

function SectionPanel({
  title,
  description,
  children,
  glow,
  action,
  style,
}: SectionPanelProps) {
  const styles = useNatalStyles();
  return (
    <MetalPanel glow={glow} style={style}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {description ? (
            <Text style={styles.sectionDescription}>{description}</Text>
          ) : null}
        </View>
        {action}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </MetalPanel>
  );
}

function PlacementRow({ label, value, detail, tag }: PlacementRowProps) {
  const styles = useNatalStyles();
  return (
    <View style={styles.row}>
      <View style={styles.rowLabelBlock}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      <View style={styles.rowValueBlock}>
        {tag ? <Text style={styles.tag}>{tag}</Text> : null}
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export function CoreIdentityCard({
  placements,
  formatPlacement,
}: {
  placements: { label: string; placement?: PlanetPosition }[];
  formatPlacement: (placement?: PlanetPosition) => string;
}) {
  const { t } = useTranslation();
  return (
    <SectionPanel
      title={t('astro.natal.cards.coreIdentity.title')}
      description={t('astro.natal.cards.coreIdentity.description')}
      glow
    >
      {placements.map((item) => (
        <PlacementRow
          key={item.label}
          label={item.label}
          value={formatPlacement(item.placement)}
        />
      ))}
    </SectionPanel>
  );
}

export function KeyAnglesCard({ houses, formatPlacement }: AnglesCardProps) {
  const { t } = useTranslation();
  const angleLabels: { key: string; label: string }[] = [
    { key: '1', label: t('astro.natal.cards.keyAngles.ascendant') },
    { key: '7', label: t('astro.natal.cards.keyAngles.descendant') },
    { key: '10', label: t('astro.natal.cards.keyAngles.midheaven') },
    { key: '4', label: t('astro.natal.cards.keyAngles.imumCoeli') },
  ];

  return (
    <SectionPanel
      title={t('astro.natal.cards.keyAngles.title')}
      description={t('astro.natal.cards.keyAngles.description')}
    >
      {angleLabels.map((angle) => (
        <PlacementRow
          key={angle.label}
          label={angle.label}
          value={formatPlacement(houses?.[angle.key])}
        />
      ))}
    </SectionPanel>
  );
}

export function PlanetsCard({
  planets,
  orderedKeys,
  formatPlacement,
  getHouseLabel,
  retrogradeTag,
}: PlanetsCardProps) {
  const { t } = useTranslation();
  return (
    <SectionPanel
      title={t('astro.natal.cards.planets.title')}
      description={t('astro.natal.cards.planets.description')}
    >
      {orderedKeys.map((key) => {
        const placement = planets[key];
        const houseText = getHouseLabel?.(key);
        const tag = retrogradeTag?.(placement) ?? undefined;
        return (
          <PlacementRow
            key={key}
            label={t(`astro.natal.planets.${key}`, {
              defaultValue: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            })}
            value={formatPlacement(placement)}
            detail={houseText || undefined}
            tag={tag || undefined}
          />
        );
      })}
    </SectionPanel>
  );
}

export function HousesCard({ houses, formatPlacement }: HousesCardProps) {
  const { t } = useTranslation();
  const sorted = Object.keys(houses).sort((a, b) => Number(a) - Number(b));
  return (
    <SectionPanel
      title={t('astro.natal.cards.houses.title')}
      description={t('astro.natal.cards.houses.description')}
    >
      {sorted.map((houseKey) => (
        <PlacementRow
          key={houseKey}
          label={t('astro.natal.cards.houses.itemLabel', { number: houseKey })}
          value={formatPlacement(houses[houseKey])}
        />
      ))}
    </SectionPanel>
  );
}

export function AspectsCard({ aspects, renderAspect }: AspectsCardProps) {
  const { t } = useTranslation();
  const styles = useNatalStyles();
  return (
    <SectionPanel
      title={t('astro.natal.cards.aspects.title')}
      description={t('astro.natal.cards.aspects.description')}
    >
      {aspects.length === 0 ? (
        <Text style={styles.muted}>{t('astro.natal.cards.aspects.empty')}</Text>
      ) : (
        aspects.map((aspect, index) => (
          <View key={index} style={styles.aspectRow}>
            {renderAspect(aspect, index)}
          </View>
        ))
      )}
    </SectionPanel>
  );
}

export function ElementBalanceCard({ elements }: ElementBalanceCardProps) {
  const { t } = useTranslation();
  const styles = useNatalStyles();
  const { theme } = useTheme();
  const maxCount = Math.max(...elements.map((item) => item.count), 1);
  const palette = [
    theme.palette.amethyst,
    theme.palette.glow,
    theme.palette.ember,
    theme.palette.silver,
  ];

  return (
    <SectionPanel
      title={t('astro.natal.cards.elementBalance.title')}
      description={t('astro.natal.cards.elementBalance.description')}
    >
      {elements.map((item, idx) => {
        const widthPercent = Math.max((item.count / maxCount) * 100, 4);
        const barColor = palette[idx % palette.length];
        return (
          <View key={item.element} style={styles.elementRow}>
            <Text style={styles.rowLabel}>
              {t(`astro.natal.elements.${item.element.toLowerCase()}`, {
                defaultValue: item.element,
              })}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${widthPercent}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <Text style={styles.rowValue}>{item.count}</Text>
          </View>
        );
      })}
    </SectionPanel>
  );
}

export function PlanetLegend({ planetKeys }: PlanetLegendProps) {
  const { t } = useTranslation();
  const styles = useNatalStyles();
  const { theme } = useTheme();
  if (planetKeys.length === 0) {
    return null;
  }
  return (
    <SectionPanel
      title={t('astro.natal.cards.planetLegend.title')}
      description={t('astro.natal.cards.planetLegend.description')}
    >
      <View style={styles.legendGrid}>
        {planetKeys.map((key) => {
          const color = PLANET_COLORS[key.toLowerCase()] ?? theme.palette.platinum;
          return (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.rowLabel}>
                {t(`astro.natal.planets.${key}`, {
                  defaultValue: key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase()),
                })}
              </Text>
            </View>
          );
        })}
      </View>
    </SectionPanel>
  );
}

export function SelectedPlanetCard({
  planetKey,
  placement,
  houseLabel,
  formatPlacement,
  retrogradeTag,
}: SelectedPlanetProps) {
  const { t } = useTranslation();
  if (!planetKey || !placement) {
    return null;
  }
  return (
    <SectionPanel
      title={t('astro.natal.cards.selectedPlanet.title')}
      description={t('astro.natal.cards.selectedPlanet.description')}
    >
      <PlacementRow
        label={t(`astro.natal.planets.${planetKey}`, {
          defaultValue: planetKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        })}
        value={formatPlacement(placement)}
        detail={houseLabel || undefined}
        tag={retrogradeTag?.(placement) || undefined}
      />
    </SectionPanel>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    sectionHeaderText: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    sectionBody: {
      marginTop: theme.spacing.sm,
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.xs,
    },
    rowLabelBlock: {
      flexShrink: 1,
      gap: 2,
    },
    rowLabel: {
      color: theme.palette.platinum,
      ...theme.typography.body,
    },
    rowDetail: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    rowValueBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    rowValue: {
      color: theme.palette.pearl,
      ...theme.typography.body,
    },
    tag: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.palette.titanium,
      color: theme.palette.platinum,
      ...theme.typography.caption,
    },
    muted: {
      color: theme.palette.silver,
      ...theme.typography.body,
    },
    aspectRow: {
      paddingVertical: theme.spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.palette.titanium,
    },
    elementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    barTrack: {
      flex: 1,
      height: 8,
      backgroundColor: theme.palette.titanium,
      borderRadius: theme.radius.pill,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: theme.radius.pill,
    },
    legendGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      minWidth: '40%',
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
  });

function useNatalStyles() {
  const { theme } = useTheme();
  return useMemo(() => createStyles(theme), [theme]);
}
