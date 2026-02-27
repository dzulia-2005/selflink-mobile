import { StyleSheet } from 'react-native';
import {type Theme } from '@theme';

export const createStyles = (theme: Theme) =>
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
