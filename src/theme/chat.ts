import type { Theme } from './tokens';

export const createChatTheme = (theme: Theme) => ({
  background: theme.colors.background,
  backgroundGradient: [
    theme.colors.background,
    theme.colors.background,
    theme.colors.background,
  ] as const,
  surface: theme.colors.surface,
  header: {
    title: theme.text.primary,
    subtitle: theme.text.muted,
    iconBackground: [theme.palette.glow, theme.palette.azure] as const,
    shadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 10,
    },
  },
  bubble: {
    user: {
      background: theme.palette.azure,
      border: theme.palette.azure,
      text: theme.text.inverted,
      timestamp: theme.text.secondary,
    },
    mentor: {
      background: theme.colors.surfaceAlt,
      text: theme.text.primary,
      timestamp: theme.text.muted,
      shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
        elevation: 8,
      },
    },
    system: {
      text: theme.text.muted,
    },
    radius: 20,
    maxWidth: '85%',
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
  },
  typography: {
    body: {
      fontSize: 15,
      lineHeight: 22,
    },
    timestamp: {
      fontSize: 11,
    },
    heading: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '700' as const,
    },
  },
  input: {
    background: theme.colors.surface,
    border: theme.colors.border,
    placeholder: theme.text.muted,
    text: theme.text.primary,
    shadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 12,
    },
  },
});

export type ChatTheme = ReturnType<typeof createChatTheme>;
