export const MENTOR_DOMAIN_KEY = 'mentor' as const;
export const MENTOR_ENABLED_BY_DEFAULT = true;

export const MENTOR_STACK_ROUTES = [
  'MentorHome',
  'BirthData',
  'NatalChart',
  'NatalMentor',
  'DailyMentor',
  'DailyMentorEntry',
  'MentorChat',
] as const;

export const MENTOR_TAB_ROUTES = ['Mentor'] as const;

export type MentorStackRouteName = (typeof MENTOR_STACK_ROUTES)[number];
export type MentorTabRouteName = (typeof MENTOR_TAB_ROUTES)[number];
