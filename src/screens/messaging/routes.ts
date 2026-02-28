export const MESSAGING_DOMAIN_KEY = 'messaging' as const;
export const MESSAGING_ENABLED_BY_DEFAULT = true;

export const MESSAGING_STACK_ROUTES = ['Threads', 'Chat'] as const;
export const MESSAGING_TAB_ROUTES = ['Messages'] as const;
export const MESSAGING_AUX_ROUTES = ['Inbox'] as const;

export type MessagingStackRouteName = (typeof MESSAGING_STACK_ROUTES)[number];
export type MessagingTabRouteName = (typeof MESSAGING_TAB_ROUTES)[number];
export type MessagingAuxRouteName = (typeof MESSAGING_AUX_ROUTES)[number];
