import { StyleSheet } from 'react-native';

import { type Theme } from '@theme';

export const createStyles = (theme: Theme) =>
    StyleSheet.create({
      gradient: { flex: 1 },
      container: {
        flexGrow: 1,
        padding: theme.spacing.xl,
      },
      card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.lg,
        padding: theme.spacing.xl,
        gap: theme.spacing.lg,
        ...theme.shadows.card,
        position: 'relative',
        overflow: 'hidden',
      },
      cardBadge: {
        position: 'absolute',
        right: -40,
        top: -40,
        width: 140,
        height: 140,
        opacity: 0.2,
        borderRadius: 80,
      },
      title: {
        color: theme.text.primary,
        ...theme.typography.headingL,
      },
      subtitle: {
        color: theme.text.secondary,
        ...theme.typography.body,
      },
      inputGroup: {
        gap: theme.spacing.xs,
      },
      inputLabel: {
        color: theme.text.secondary,
        ...theme.typography.caption,
      },
      required: {
        color: theme.colors.error,
      },
      input: {
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radii.md,
        padding: theme.spacing.lg,
        color: theme.text.primary,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      inputError: {
        borderColor: theme.colors.error,
      },
      errorText: {
        color: theme.colors.error,
        ...theme.typography.caption,
      },
      button: {
        borderRadius: theme.radii.lg,
        ...theme.shadows.button,
      },
      buttonGradient: {
        borderRadius: theme.radii.lg,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
      },
      buttonDisabled: {
        opacity: 0.6,
      },
      buttonLabel: {
        color: theme.text.primary,
        ...theme.typography.button,
      },
    });
