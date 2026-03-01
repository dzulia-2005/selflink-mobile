export const FEED_DOMAIN_KEY = 'feed' as const;
export const FEED_ENABLED_BY_DEFAULT = true;

export const FEED_STACK_ROUTES = [
  'FeedHome',
  'PostDetails',
  'CreatePost',
  'SearchProfiles',
  'UserProfile',
  'SoulReels',
] as const;

export const FEED_TAB_ROUTES = ['Feed', 'CreatePostTab'] as const;

export type FeedStackRouteName = (typeof FEED_STACK_ROUTES)[number];
export type FeedTabRouteName = (typeof FEED_TAB_ROUTES)[number];
