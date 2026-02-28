export const COMMUNITY_DOMAIN_KEY = 'community' as const;
export const COMMUNITY_ENABLED_BY_DEFAULT = true;

export const COMMUNITY_STACK_ROUTES = ['Community'] as const;
export const COMMUNITY_TAB_ROUTES = [] as const;

export type CommunityStackRouteName = (typeof COMMUNITY_STACK_ROUTES)[number];
