export const PROFILE_DOMAIN_KEY = 'profile' as const;
export const PROFILE_ENABLED_BY_DEFAULT = true;

export const PROFILE_STACK_ROUTES = [
  'ProfileHome',
  'SearchProfiles',
  'UserProfile',
  'ProfileEdit',
  'Payments',
  'WalletLedger',
  'Notifications',
  'Community',
  'Inbox',
] as const;

export const PROFILE_TAB_ROUTES = ['Profile'] as const;

export type ProfileStackRouteName = (typeof PROFILE_STACK_ROUTES)[number];
export type ProfileTabRouteName = (typeof PROFILE_TAB_ROUTES)[number];
