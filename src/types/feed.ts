import type { Identifier, Post } from './social';

export type MentorInsightCard = {
  title: string;
  subtitle?: string;
  cta?: string;
};

export type MatrixInsightCard = {
  title: string;
  subtitle?: string;
  cta?: string;
};

export type SoulMatchProfileSummary = {
  id: number;
  name: string;
  avatarUrl?: string | null;
  score?: number | null;
};

export type SoulMatchFeedCard = {
  title: string;
  subtitle?: string;
  cta?: string;
  profiles: SoulMatchProfileSummary[];
};

export type FeedMode = 'for_you' | 'following';

export type PostFeedItem = {
  type: 'post';
  id: Identifier;
  post: Post;
};

export type MentorInsightFeedItem = {
  type: 'mentor_insight';
  id: Identifier;
  mentor: MentorInsightCard;
};

export type MatrixInsightFeedItem = {
  type: 'matrix_insight';
  id: Identifier;
  matrix: MatrixInsightCard;
};

export type SoulMatchFeedItem = {
  type: 'soulmatch_reco';
  id: Identifier;
  soulmatch: SoulMatchFeedCard;
};

export type FeedItem =
  | PostFeedItem
  | MentorInsightFeedItem
  | MatrixInsightFeedItem
  | SoulMatchFeedItem;

export interface FeedResponse {
  items: FeedItem[];
  nextUrl: string | null;
}
