import { theme } from '../theme';

export const chatTheme = {
  background: theme.palette.midnight,
  surface: theme.palette.charcoal,
  bubble: {
    user: {
      background: theme.palette.azure + '22',
      border: theme.palette.azure + '55',
      text: theme.palette.platinum,
      timestamp: theme.palette.silver,
    },
    mentor: {
      background: theme.palette.pearl,
      text: theme.palette.titanium,
      timestamp: theme.palette.graphite,
    },
    system: {
      text: theme.palette.silver,
    },
    radius: 18,
    maxWidth: '82%',
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
    background: theme.palette.obsidian,
    border: theme.palette.titanium,
    placeholder: theme.palette.silver,
    text: theme.palette.platinum,
  },
};

export type ChatTheme = typeof chatTheme;
