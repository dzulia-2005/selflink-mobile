export const SOULMATCH_DOMAIN_KEY = 'soulmatch' as const;
export const SOULMATCH_ENABLED_BY_DEFAULT = true;

export const SOULMATCH_STACK_ROUTES = [
  'SoulMatchHome',
  'SoulMatchRecommendations',
  'SoulMatchDetail',
  'SoulMatchMentor',
] as const;

export const SOULMATCH_TAB_ROUTES = ['SoulMatch'] as const;

export type SoulmatchStackRouteName = (typeof SOULMATCH_STACK_ROUTES)[number];
export type SoulmatchTabRouteName = (typeof SOULMATCH_TAB_ROUTES)[number];
