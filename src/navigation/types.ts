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
};

export type MessagesStackParamList = {
  Threads: undefined;
  Chat: { threadId: string; otherUserId?: number };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  SearchProfiles: undefined;
  UserProfile: { userId: number };
};

export type MainTabsParamList = {
  Feed: NavigatorScreenParams<FeedStackParamList> | undefined;
  Messages: NavigatorScreenParams<MessagesStackParamList> | undefined;
  Mentor: undefined;
  SoulMatch: undefined;
  Payments: undefined;
  WalletLedger: undefined;
  Notifications: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
  Community: undefined;
  Inbox: undefined;
};
