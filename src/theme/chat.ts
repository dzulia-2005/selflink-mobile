import { theme } from '../theme';

export const chatTheme = {
  background: theme.palette.midnight,
  backgroundGradient: ['rgba(7,12,28,0.92)', 'rgba(5,8,18,0.96)', 'rgba(2,6,23,1)'] as const,
  surface: theme.palette.charcoal,
  header: {
    title: theme.palette.platinum,
    subtitle: theme.palette.silver,
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
      text: theme.palette.pearl,
      timestamp: theme.palette.platinum,
    },
    mentor: {
      background: '#0F172A',
      text: theme.palette.platinum,
      timestamp: theme.palette.silver,
      shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
        elevation: 8,
      },
    },
    system: {
      text: theme.palette.silver,
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
    background: '#0B1222',
    border: '#1E293B',
    placeholder: theme.palette.silver,
    text: theme.palette.platinum,
    shadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 12,
    },
  },
};

export type ChatTheme = typeof chatTheme;
