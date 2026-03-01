import { COMMUNITY_DOMAIN_KEY } from '@screens/community/routes';
import { FEED_DOMAIN_KEY } from '@screens/feed/routes';
import { MESSAGING_DOMAIN_KEY } from '@screens/messaging/routes';
import { PAYMENTS_DOMAIN_KEY } from '@screens/payments/routes';
import { PROFILE_DOMAIN_KEY } from '@screens/profile/routes';
import { SOULMATCH_DOMAIN_KEY } from '@screens/soulmatch/routes';

export const DOMAIN_KEYS = {
  astro: 'astro',
  auth: 'auth',
  community: COMMUNITY_DOMAIN_KEY,
  feed: FEED_DOMAIN_KEY,
  mentor: 'mentor',
  messaging: MESSAGING_DOMAIN_KEY,
  notifications: 'notifications',
  onboarding: 'onboarding',
  payments: PAYMENTS_DOMAIN_KEY,
  profile: PROFILE_DOMAIN_KEY,
  soulmatch: SOULMATCH_DOMAIN_KEY,
  video: 'video',
} as const;

export type DomainKey = (typeof DOMAIN_KEYS)[keyof typeof DOMAIN_KEYS];

export type DomainModule = {
  key: DomainKey;
  enabledByDefault: boolean;
};

export const DOMAIN_MODULES: readonly DomainModule[] = [
  { key: DOMAIN_KEYS.auth, enabledByDefault: true },
  { key: DOMAIN_KEYS.onboarding, enabledByDefault: true },
  { key: DOMAIN_KEYS.feed, enabledByDefault: true },
  { key: DOMAIN_KEYS.mentor, enabledByDefault: true },
  { key: DOMAIN_KEYS.astro, enabledByDefault: true },
  { key: DOMAIN_KEYS.soulmatch, enabledByDefault: true },
  { key: DOMAIN_KEYS.profile, enabledByDefault: true },
  { key: DOMAIN_KEYS.payments, enabledByDefault: true },
  { key: DOMAIN_KEYS.community, enabledByDefault: true },
  { key: DOMAIN_KEYS.messaging, enabledByDefault: true },
  { key: DOMAIN_KEYS.notifications, enabledByDefault: true },
  { key: DOMAIN_KEYS.video, enabledByDefault: true },
] as const;

export type DomainFeatureFlags = Record<DomainKey, boolean>;

export function getDomainFeatureFlags(
  overrides?: Partial<DomainFeatureFlags>,
): DomainFeatureFlags {
  const defaults = DOMAIN_MODULES.reduce((acc, module) => {
    acc[module.key] = module.enabledByDefault;
    return acc;
  }, {} as DomainFeatureFlags);

  if (!overrides) {
    return defaults;
  }

  return {
    ...defaults,
    ...overrides,
  };
}

export function isDomainEnabled(flags: DomainFeatureFlags, key: DomainKey): boolean {
  return Boolean(flags[key]);
}
