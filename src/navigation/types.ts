import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  SocialLogin: undefined;
};

export type OnboardingStackParamList = {
  PersonalMap: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

export type FeedStackParamList = {
  FeedHome: undefined;
  PostDetails: { postId: string; post?: unknown } | undefined;
  CreatePost: undefined;
  SearchProfiles: undefined;
  UserProfile: { userId: number };
  SoulReels: undefined;
};

export type MessagesStackParamList = {
  Threads: undefined;
  Chat: { threadId: string; otherUserId?: number };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  SearchProfiles: undefined;
  UserProfile: { userId: number };
  ProfileEdit: undefined;
};

export type MentorStackParamList = {
  MentorHome: undefined;
  BirthData: undefined;
  NatalChart: undefined;
  NatalMentor: undefined;
  DailyMentor: undefined;
  DailyMentorEntry: { sessionId: number | string };
  MentorChat: undefined;
};

export type SoulMatchStackParamList = {
  SoulMatchHome: undefined;
  SoulMatchRecommendations: undefined;
  SoulMatchDetail: {
    userId: number;
    displayName?: string;
    explainLevel?: import('@schemas/soulmatch').SoulmatchExplainLevel;
    mode?: import('@schemas/soulmatch').SoulmatchMode;
  };
  SoulMatchMentor: { userId: number; displayName?: string };
};

export type MainTabsParamList = {
  Feed: NavigatorScreenParams<FeedStackParamList> | undefined;
  Messages: NavigatorScreenParams<MessagesStackParamList> | undefined;
  Mentor: NavigatorScreenParams<MentorStackParamList> | undefined;
  SoulMatch: NavigatorScreenParams<SoulMatchStackParamList> | undefined;
  Payments: undefined;
  WalletLedger: undefined;
  Notifications: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  Community: undefined;
  Inbox: undefined;
};
