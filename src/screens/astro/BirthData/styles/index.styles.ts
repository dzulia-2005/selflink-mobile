import { StyleSheet } from 'react-native';

import {type Theme } from '@theme';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.palette.midnight,
    },
    flex: {
      flex: 1,
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
    panelTitle: {
      color: theme.palette.titanium,
      ...theme.typography.subtitle,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    bodyText: {
      color: theme.palette.silver,
      ...theme.typography.body,
      marginBottom: theme.spacing.md,
    },
    input: {
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.palette.pearl,
      color: theme.palette.titanium,
      marginBottom: theme.spacing.sm,
    },
    hint: {
      color: theme.palette.silver,
      ...theme.typography.caption,
      marginTop: theme.spacing.sm,
    },
    mapCtaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    mapButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.palette.azure,
      backgroundColor: 'rgba(37, 99, 235, 0.08)',
    },
    mapButtonLabel: {
      color: theme.palette.azure,
      ...theme.typography.button,
    },
    clearLink: {
      marginLeft: 'auto',
    },
    clearLabel: {
      color: theme.palette.rose,
      ...theme.typography.caption,
      fontWeight: '700',
    },
    selectedSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    selectedSummaryText: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    selectedIcon: {
      marginTop: 1,
    },
  });
