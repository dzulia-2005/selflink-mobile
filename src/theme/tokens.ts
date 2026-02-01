export type ThemeName = 'light' | 'dark';
export type ThemeMode = ThemeName | 'system';

const darkPalette = {
  midnight: '#030712',
  obsidian: '#0B1324',
  charcoal: '#111A2F',
  titanium: '#1E293B',
  steel: '#334155',
  graphite: '#475569',
  silver: '#94A3B8',
  platinum: '#E2E8F0',
  pearl: '#F8FAFC',
  azure: '#0EA5E9',
  glow: '#06B6D4',
  amethyst: '#7C3AED',
  rose: '#F472B6',
  ember: '#FB7185',
  lime: '#22C55E',
};

const lightPalette = {
  midnight: '#0F172A',
  obsidian: '#F8FAFC',
  charcoal: '#F1F5F9',
  titanium: '#E2E8F0',
  steel: '#CBD5E1',
  graphite: '#94A3B8',
  silver: '#64748B',
  platinum: '#334155',
  pearl: '#0F172A',
  azure: '#0EA5E9',
  glow: '#06B6D4',
  amethyst: '#7C3AED',
  rose: '#DB2777',
  ember: '#EF4444',
  lime: '#16A34A',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

const typography = {
  headingXL: { fontSize: 32, fontWeight: '700' as const },
  headingL: { fontSize: 24, fontWeight: '700' as const },
  headingM: { fontSize: 20, fontWeight: '600' as const },
  title: { fontSize: 28, fontWeight: '600' as const, letterSpacing: 0.5 },
  subtitle: { fontSize: 18, fontWeight: '400' as const, letterSpacing: 0.3 },
  button: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0.4 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
};

const baseRadii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 28,
  pill: 999,
  full: 9999,
};

export type Theme = {
  palette: typeof darkPalette;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverted: string;
  };
  gradients: {
    appBackground: readonly string[];
    card: readonly string[];
    cta: readonly string[];
    accent: readonly string[];
    matrix: readonly string[];
    nebulaPurple: readonly string[];
    cosmicBlue: readonly string[];
    matrixGlow: readonly string[];
    soulPink: readonly string[];
    mentorGold: readonly string[];
    button: readonly string[];
    buttonActive: readonly string[];
    buttonDisabled: readonly string[];
    panel: readonly string[];
    messagingBackground: readonly string[];
    messagingOutgoing: readonly string[];
    messagingIncoming: readonly string[];
  };
  spacing: typeof spacing;
  radii: typeof baseRadii;
  radius: typeof baseRadii;
  typography: typeof typography;
  messaging: {
    backgroundStart: string;
    backgroundEnd: string;
    outgoingBorder: string;
    outgoingTile: string;
    outgoingInner: string;
    incomingTile: string;
    incomingBorder: string;
    ink: string;
    subduedInk: string;
    placeholder: string;
    errorBg: string;
    errorBorder: string;
  };
  shadows: {
    card: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    button: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    cosmic: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    soft: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
  shadow: {
    panel: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    button: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    soft: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
  rhythm: {
    cardMargin: number;
    cardRadius: number;
    verticalRhythm: number;
    cosmicPadding: number;
  };
  reels: {
    backgroundStart: string;
    backgroundEnd: string;
    overlayGlass: string;
    textPrimary: string;
    textSecondary: string;
    accentLike: string;
    accentIcon: string;
  };
  feed: {
    backgroundStart: string;
    backgroundEnd: string;
    glass: string;
    border: string;
    glow: string;
    textPrimary: string;
    textMuted: string;
    accentBlue: string;
    accentCyan: string;
    cardBackground: string;
    cardBorder: string;
    cardGlow: string;
    textSecondary: string;
    actionBorder: string;
    actionLikedBorder: string;
    actionLikedBackground: string;
  };
};

const darkTheme: Theme = {
  palette: darkPalette,
  colors: {
    primary: '#7C3AED',
    secondary: '#06B6D4',
    background: darkPalette.midnight,
    surface: darkPalette.obsidian,
    surfaceAlt: darkPalette.charcoal,
    border: darkPalette.titanium,
    success: '#22C55E',
    warning: '#FACC15',
    error: '#F87171',
  },
  text: {
    primary: darkPalette.pearl,
    secondary: darkPalette.platinum,
    muted: darkPalette.silver,
    inverted: darkPalette.midnight,
  },
  gradients: {
    appBackground: ['#050818', '#020617'] as const,
    card: ['#0E1528', '#121B33'] as const,
    cta: ['#7C3AED', '#06B6D4'] as const,
    accent: ['#0EA5E9', '#7C3AED'] as const,
    matrix: ['#14B8A6', '#6366F1'] as const,
    nebulaPurple: ['#5A2E98', '#9B4EFF'] as const,
    cosmicBlue: ['#1B2B66', '#3B4FFF'] as const,
    matrixGlow: ['#00FFA3', '#06D19A'] as const,
    soulPink: ['#FF6BAA', '#FF3FA4'] as const,
    mentorGold: ['#FFD86B', '#FFB55A'] as const,
    button: ['#4e15c8', '#6628c2'] as const,
    buttonActive: ['#8B5CF6', '#312E81'] as const,
    buttonDisabled: ['#94A3B8', '#CBD5F5'] as const,
    panel: ['#0F172A', '#1E293B'] as const,
    messagingBackground: ['#F5F3EE', '#E7DFD3'] as const,
    messagingOutgoing: ['rgba(16,185,129,0.16)', 'rgba(16,185,129,0.08)'] as const,
    messagingIncoming: ['rgba(15,23,42,0.06)', 'rgba(15,23,42,0.04)'] as const,
  },
  spacing,
  radii: baseRadii,
  radius: baseRadii,
  typography,
  messaging: {
    backgroundStart: '#F5F3EE',
    backgroundEnd: '#E7DFD3',
    outgoingBorder: 'rgba(16, 185, 129, 0.35)',
    outgoingTile: 'rgba(16, 185, 129, 0.12)',
    outgoingInner: 'rgba(255,255,255,0.72)',
    incomingTile: 'rgba(15,23,42,0.06)',
    incomingBorder: 'rgba(148,163,184,0.15)',
    ink: '#0F172A',
    subduedInk: 'rgba(15,23,42,0.55)',
    placeholder: 'rgba(148,163,184,0.16)',
    errorBg: 'rgba(248,113,113,0.16)',
    errorBorder: 'rgba(248,113,113,0.45)',
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 12,
    },
    button: {
      shadowColor: '#0EA5E9',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 6,
    },
    cosmic: {
      shadowColor: '#5A2E98',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.45,
      shadowRadius: 32,
      elevation: 14,
    },
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  shadow: {
    panel: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 18,
      elevation: 10,
    },
    button: {
      shadowColor: '#0EA5E9',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 14,
      elevation: 8,
    },
  },
  rhythm: {
    cardMargin: 14,
    cardRadius: 20,
    verticalRhythm: 12,
    cosmicPadding: 18,
  },
  reels: {
    backgroundStart: '#020617',
    backgroundEnd: '#020617',
    overlayGlass: 'rgba(15,23,42,0.78)',
    textPrimary: '#F9FAFB',
    textSecondary: 'rgba(226,232,240,0.85)',
    accentLike: '#FB7185',
    accentIcon: '#E5E7EB',
  },
  feed: {
    backgroundStart: '#01030b',
    backgroundEnd: '#020617',
    glass: 'rgba(15,23,42,0.88)',
    border: 'rgba(59,130,246,0.35)',
    glow: 'rgba(59,130,246,0.18)',
    textPrimary: '#eceef3',
    textMuted: 'rgba(226,232,240,0.65)',
    accentBlue: '#3B82F6',
    accentCyan: '#22D3EE',
    cardBackground: 'rgba(5, 9, 19, 0.94)',
    cardBorder: 'rgba(59,130,246,0.35)',
    cardGlow: 'rgba(0,0,0,0.35)',
    textSecondary: 'rgba(148,163,184,0.9)',
    actionBorder: 'rgba(148,163,184,0.45)',
    actionLikedBorder: 'rgba(48, 32, 189, 0.75)',
    actionLikedBackground: 'rgba(151, 40, 60, 0.51)',
  },
};

const lightTheme: Theme = {
  palette: lightPalette,
  colors: {
    primary: '#7C3AED',
    secondary: '#06B6D4',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F5F9',
    border: '#E2E8F0',
    success: '#16A34A',
    warning: '#D97706',
    error: '#EF4444',
  },
  text: {
    primary: '#0F172A',
    secondary: '#1E293B',
    muted: '#475569',
    inverted: '#F8FAFC',
  },
  gradients: {
    appBackground: ['#F8FAFC', '#E2E8F0'] as const,
    card: ['#FFFFFF', '#F1F5F9'] as const,
    cta: ['#7C3AED', '#06B6D4'] as const,
    accent: ['#0EA5E9', '#7C3AED'] as const,
    matrix: ['#14B8A6', '#6366F1'] as const,
    nebulaPurple: ['#7C3AED', '#A78BFA'] as const,
    cosmicBlue: ['#1D4ED8', '#38BDF8'] as const,
    matrixGlow: ['#00FFA3', '#06D19A'] as const,
    soulPink: ['#FF6BAA', '#FF3FA4'] as const,
    mentorGold: ['#FFD86B', '#FFB55A'] as const,
    button: ['#7C3AED', '#6D28D9'] as const,
    buttonActive: ['#8B5CF6', '#4C1D95'] as const,
    buttonDisabled: ['#CBD5F5', '#E2E8F0'] as const,
    panel: ['#FFFFFF', '#F1F5F9'] as const,
    messagingBackground: ['#F8FAFC', '#E2E8F0'] as const,
    messagingOutgoing: ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.08)'] as const,
    messagingIncoming: ['rgba(15,23,42,0.06)', 'rgba(15,23,42,0.04)'] as const,
  },
  spacing,
  radii: baseRadii,
  radius: baseRadii,
  typography,
  messaging: {
    backgroundStart: '#F8FAFC',
    backgroundEnd: '#E2E8F0',
    outgoingBorder: 'rgba(16, 185, 129, 0.35)',
    outgoingTile: 'rgba(16, 185, 129, 0.12)',
    outgoingInner: 'rgba(255,255,255,0.9)',
    incomingTile: 'rgba(15,23,42,0.04)',
    incomingBorder: 'rgba(148,163,184,0.25)',
    ink: '#0F172A',
    subduedInk: 'rgba(15,23,42,0.65)',
    placeholder: 'rgba(148,163,184,0.22)',
    errorBg: 'rgba(248,113,113,0.18)',
    errorBorder: 'rgba(248,113,113,0.55)',
  },
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 8,
    },
    button: {
      shadowColor: '#0EA5E9',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    cosmic: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 10,
    },
    soft: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 6,
    },
  },
  shadow: {
    panel: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 16,
      elevation: 6,
    },
    button: {
      shadowColor: '#0EA5E9',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 6,
    },
    soft: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  rhythm: {
    cardMargin: 14,
    cardRadius: 20,
    verticalRhythm: 12,
    cosmicPadding: 18,
  },
  reels: {
    backgroundStart: '#F8FAFC',
    backgroundEnd: '#E2E8F0',
    overlayGlass: 'rgba(255,255,255,0.85)',
    textPrimary: '#0F172A',
    textSecondary: 'rgba(71,85,105,0.9)',
    accentLike: '#FB7185',
    accentIcon: '#334155',
  },
  feed: {
    backgroundStart: '#F8FAFC',
    backgroundEnd: '#E2E8F0',
    glass: 'rgba(255,255,255,0.9)',
    border: 'rgba(148,163,184,0.5)',
    glow: 'rgba(59,130,246,0.12)',
    textPrimary: '#0F172A',
    textMuted: 'rgba(71,85,105,0.7)',
    accentBlue: '#2563EB',
    accentCyan: '#0891B2',
    cardBackground: '#FFFFFF',
    cardBorder: 'rgba(148,163,184,0.5)',
    cardGlow: 'rgba(15,23,42,0.08)',
    textSecondary: 'rgba(71,85,105,0.85)',
    actionBorder: 'rgba(148,163,184,0.6)',
    actionLikedBorder: 'rgba(248,113,113,0.65)',
    actionLikedBackground: 'rgba(248,113,113,0.12)',
  },
};

export const themes: Record<ThemeName, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};
