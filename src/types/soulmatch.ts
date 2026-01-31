import { User } from './user';

export type SoulmatchComponents = {
  astro?: number;
  matrix?: number;
  psychology?: number;
  lifestyle?: number;
};

export type SoulmatchExplainLevel = 'free' | 'premium' | 'premium_plus';
export type SoulmatchMode = 'compat' | 'dating';

export type SoulmatchExplanation = {
  short?: string;
  full?: string;
  strategy?: string;
};

export type SoulmatchTimingWindow = {
  starts_at?: string;
  ends_at?: string;
  label?: string;
};

export type SoulmatchResult = {
  user: Pick<User, 'id' | 'name' | 'handle' | 'photo'>;
  user_id?: number; // some endpoints may return user_id instead of nested user
  score: number;
  components: SoulmatchComponents;
  tags: string[];
  mentor_text?: string;
  lens?: string;
  lens_label?: string;
  lens_reason_short?: string;
  timing_score?: number;
  timing_summary?: string;
  timing_window?: SoulmatchTimingWindow;
  compatibility_trend?: string;
  explanation_level?: SoulmatchExplainLevel;
  explanation?: SoulmatchExplanation;
};
