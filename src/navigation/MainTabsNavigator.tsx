import { Ionicons } from '@expo/vector-icons';
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import BirthDataScreen from '@screens/astro/BirthData';
import NatalChartScreen from '@screens/astro/NatalChart';
import { CommunityScreen } from '@screens/CommunityScreen';
import { CreatePostScreen } from '@screens/feed/CreatePostScreen';
import { FeedScreen } from '@screens/feed/FeedScreen';
import { PostDetailsScreen } from '@screens/feed/PostDetailsScreen';
import { InboxScreen } from '@screens/InboxScreen';
import { DailyMentorEntryScreen } from '@screens/mentor/DailyMentorEntryScreen';
import { DailyMentorScreen } from '@screens/mentor/DailyMentorScreen';
import { MentorChatScreen } from '@screens/mentor/MentorChatScreen';
import { MentorHomeScreen } from '@screens/mentor/MentorHomeScreen';
import { NatalMentorScreen } from '@screens/mentor/NatalMentorScreen';
import { ChatScreen } from '@screens/messaging/ChatScreen';
import { ThreadsScreen } from '@screens/messaging/ThreadsScreen';
import { NotificationsScreen } from '@screens/notifications/NotificationsScreen';
import { PaymentsScreen } from '@screens/PaymentsScreen';
import { ProfileEditScreen } from '@screens/profile/ProfileEditScreen';
import { ProfileScreen } from '@screens/profile/ProfileScreen';
import { SearchProfilesScreen } from '@screens/profile/SearchProfilesScreen';
import { UserProfileScreen } from '@screens/profile/UserProfileScreen';
import { SoulMatchDetailsScreen } from '@screens/soulmatch/SoulMatchDetailsScreen';
import { SoulMatchMentorScreen } from '@screens/soulmatch/SoulMatchMentorScreen';
import { SoulMatchRecommendationsScreen } from '@screens/soulmatch/SoulMatchRecommendationsScreen';
import { SoulMatchScreen } from '@screens/SoulMatchScreen';
import { SoulReelsScreen } from '@screens/video/SoulReelsScreen';
import { WalletLedgerScreen } from '@screens/WalletLedgerScreen';
import { useTheme } from '@theme';

import type {
  MainTabsParamList,
  FeedStackParamList,
  MessagesStackParamList,
  ProfileStackParamList,
  MentorStackParamList,
  SoulMatchStackParamList,
} from './types';

// import React from 'react';

const SELF_LINK_GREEN = '#16a34a';
const HIDDEN_TAB_OPTIONS = { tabBarButton: () => null };
const CENTER_POST_BUTTON_SIZE = 66;

const Tab = createBottomTabNavigator<MainTabsParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const MentorStack = createNativeStackNavigator<MentorStackParamList>();
const SoulMatchStack = createNativeStackNavigator<SoulMatchStackParamList>();

function getTabIconName(
  routeName: string,
  focused: boolean,
): keyof typeof Ionicons.glyphMap {
  switch (routeName) {
    case 'Feed':
      return focused ? 'home' : 'home-outline';
    case 'Messages':
      return focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
    case 'Mentor':
      return focused ? 'sparkles' : 'sparkles-outline';
    case 'CreatePostTab':
      return focused ? 'add-circle' : 'add-circle-outline';
    case 'SoulMatch':
      return focused ? 'heart' : 'heart-outline';
    case 'Community':
      return focused ? 'people' : 'people-outline';
    case 'Inbox':
      return focused ? 'mail-unread' : 'mail-unread-outline';
    case 'Notifications':
      return focused ? 'notifications' : 'notifications-outline';
    case 'Profile':
      return focused ? 'person' : 'person-outline';
    default:
      return focused ? 'ellipse' : 'ellipse-outline';
  }
}

type TabBarIconProps = {
  color: string | ColorValue;
  focused: boolean;
  size: number;
};

const createTabBarIcon =
  (routeName: string) =>
  ({ color, size, focused }: TabBarIconProps) => {
    const iconName = getTabIconName(routeName, focused);
    return <Ionicons name={iconName} size={size} color={color as ColorValue} />;
  };

const MessagesHeader = () => {
  const { t } = useTranslation();
  return <TopBar title={t('nav.headers.messages')} />;
};

function MessagesChatHeaderLeft() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { theme } = useTheme();

  const handlePress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Messages', { screen: 'Threads' });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={messageHeaderStyles.backButton}
    >
      <Ionicons name="chevron-back" size={20} color={theme.text.primary} />
      <Text style={[messageHeaderStyles.backText, { color: theme.text.primary }]}>
        {t('nav.headers.threads')}
      </Text>
    </TouchableOpacity>
  );
}

function CreatePostTabBarButton(props: BottomTabBarButtonProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={props.onPress ?? undefined}
      onLongPress={props.onLongPress ?? undefined}
      accessibilityRole={props.accessibilityRole}
      accessibilityState={props.accessibilityState}
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
      style={[props.style, mainTabStyles.centerTabButtonShell]}
    >
      <View
        style={[
          mainTabStyles.centerTabButton,
          { borderColor: theme.colors.background },
        ]}
      >
        <Ionicons name="add" size={34} color={theme.text.inverted} />
      </View>
    </TouchableOpacity>
  );
}

function FeedStackNavigator() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <FeedStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.text.primary,
        headerShadowVisible: false,
      }}
    >
      <FeedStack.Screen
        name="FeedHome"
        component={FeedScreen}
        options={{ headerShown: false }}
      />
      <FeedStack.Screen
        name="PostDetails"
        component={PostDetailsScreen}
        options={{ title: t('nav.headers.post') }}
      />
      <FeedStack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: t('nav.headers.newPost') }}
      />
      <FeedStack.Screen
        name="SearchProfiles"
        component={SearchProfilesScreen}
        options={{ title: t('nav.headers.searchProfiles') }}
      />
      <FeedStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: t('nav.headers.profile') }}
      />
      <FeedStack.Screen
        name="SoulReels"
        component={SoulReelsScreen}
        options={{ headerShown: false }}
      />
    </FeedStack.Navigator>
  );
}

function MessagesStackNavigator() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <MessagesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.text.primary,
        headerShadowVisible: false,
      }}
    >
      <MessagesStack.Screen
        name="Threads"
        component={ThreadsScreen}
        options={{ header: MessagesHeader }}
      />
      <MessagesStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: t('nav.headers.messages'),
          headerBackVisible: false,
          headerLeft: MessagesChatHeaderLeft,
        }}
      />
    </MessagesStack.Navigator>
  );
}

function ProfileStackNavigator() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.text.primary,
        headerShadowVisible: false,
      }}
    >
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="SearchProfiles"
        component={SearchProfilesScreen}
        options={{ title: t('nav.headers.searchProfiles') }}
      />
      <ProfileStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: t('nav.headers.profile') }}
      />
      <ProfileStack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: t('nav.headers.editProfile') }}
      />
      <ProfileStack.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{ title: t('nav.headers.payments') }}
      />
      <ProfileStack.Screen
        name="WalletLedger"
        component={WalletLedgerScreen}
        options={{ title: t('nav.headers.wallet') }}
      />
      <ProfileStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('nav.headers.notifications') }}
      />
      <ProfileStack.Screen
        name="Community"
        component={CommunityScreen}
        options={{ title: t('nav.headers.community') }}
      />
      <ProfileStack.Screen
        name="Inbox"
        component={InboxScreen}
        options={{ title: t('nav.headers.inbox') }}
      />
    </ProfileStack.Navigator>
  );
}

function MentorStackNavigator() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <MentorStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.text.primary,
        headerShadowVisible: false,
      }}
    >
      <MentorStack.Screen
        name="MentorHome"
        component={MentorHomeScreen}
        options={{ headerShown: false }}
      />
      <MentorStack.Screen
        name="BirthData"
        component={BirthDataScreen}
        options={{ title: t('nav.headers.birthData') }}
      />
      <MentorStack.Screen
        name="NatalChart"
        component={NatalChartScreen}
        options={{ title: t('nav.headers.natalChart') }}
      />
      <MentorStack.Screen
        name="NatalMentor"
        component={NatalMentorScreen}
        options={{ title: t('nav.headers.natalMentor') }}
      />
      <MentorStack.Screen
        name="DailyMentor"
        component={DailyMentorScreen}
        options={{ title: t('nav.headers.dailyMentor') }}
      />
      <MentorStack.Screen
        name="DailyMentorEntry"
        component={DailyMentorEntryScreen}
        options={{ title: t('nav.headers.dailyEntry') }}
      />
      <MentorStack.Screen
        name="MentorChat"
        component={MentorChatScreen}
        options={{ title: t('nav.headers.aiMentor') }}
      />
    </MentorStack.Navigator>
  );
}

function SoulMatchStackNavigator() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <SoulMatchStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.text.primary,
        headerShadowVisible: false,
      }}
    >
      <SoulMatchStack.Screen
        name="SoulMatchHome"
        component={SoulMatchScreen}
        options={{ headerShown: false }}
      />
      <SoulMatchStack.Screen
        name="SoulMatchRecommendations"
        component={SoulMatchRecommendationsScreen}
        options={{ title: t('nav.headers.soulmatchRecommendations') }}
      />
      <SoulMatchStack.Screen
        name="SoulMatchDetail"
        component={SoulMatchDetailsScreen}
        options={{ title: t('nav.headers.soulmatch') }}
      />
      <SoulMatchStack.Screen
        name="SoulMatchMentor"
        component={SoulMatchMentorScreen}
        options={{ title: t('nav.headers.soulmatchMentor') }}
      />
    </SoulMatchStack.Navigator>
  );
}

type TopBarProps = {
  title: string;
  rightLabel?: string;
};

function TopBar({ title, rightLabel }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[
        topBarStyles.safeArea,
        { paddingTop: insets.top, backgroundColor: theme.colors.background },
      ]}
    >
      <TabBarTop
        title={title}
        rightLabel={rightLabel}
        topPadding={insets.top}
        tintColor={theme.text.primary}
        actionColor={theme.colors.primary}
        backgroundColor={theme.colors.background}
      />
    </SafeAreaView>
  );
}

type TabBarTopProps = {
  title: string;
  rightLabel?: string;
  topPadding: number;
  tintColor: string;
  actionColor: string;
  backgroundColor: string;
};

function TabBarTop({
  title,
  rightLabel,
  topPadding,
  tintColor,
  actionColor,
  backgroundColor,
}: TabBarTopProps) {
  const navigation = useNavigation<any>();
  const clampedTop = Math.max(topPadding, 8);

  return (
    <View
      style={[
        topBarStyles.container,
        { paddingTop: Math.min(clampedTop, 12), backgroundColor },
      ]}
    >
      <Text style={[topBarStyles.title, { color: tintColor }]}>{title}</Text>
      {rightLabel ? (
        <TouchableOpacity onPress={() => navigation.navigate('SearchProfiles')}>
          <Text style={[topBarStyles.action, { color: actionColor }]}>{rightLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={topBarStyles.placeholder} />
      )}
    </View>
  );
}

export function MainTabsNavigator() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 10);
  const tabHeight = 62 + safeBottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: SELF_LINK_GREEN,
        tabBarInactiveTintColor: theme.text.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabHeight,
          paddingBottom: safeBottom,
          paddingTop: 6,
          paddingHorizontal: 8,
        },
        tabBarItemStyle: {
          flex: 1,
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarLabel:
          route.name === 'Feed'
            ? t('nav.tabs.feed')
            : route.name === 'Mentor'
              ? t('nav.tabs.mentor')
              : route.name === 'SoulMatch'
                ? t('nav.tabs.soulmatch')
                : route.name === 'Profile'
                  ? t('nav.tabs.profile')
                  : route.name === 'Messages'
                    ? t('nav.tabs.messages')
                    : route.name,
        tabBarIcon: createTabBarIcon(route.name),
      })}
    >
      <Tab.Screen name="Feed" component={FeedStackNavigator} />
      <Tab.Screen name="Mentor" component={MentorStackNavigator} />
      <Tab.Screen
        name="CreatePostTab"
        component={FeedStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.navigate('Feed', { screen: 'CreatePost' });
          },
        })}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: CreatePostTabBarButton,
        }}
      />
      <Tab.Screen name="SoulMatch" component={SoulMatchStackNavigator} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
      <Tab.Screen
        name="Messages"
        component={MessagesStackNavigator}
        options={{
          ...HIDDEN_TAB_OPTIONS,
          headerShown: false,
          tabBarItemStyle: { display: 'none' as const },
        }}
      />
    </Tab.Navigator>
  );
}

const topBarStyles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  action: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
});

const mainTabStyles = StyleSheet.create({
  centerTabButtonShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTabButton: {
    marginTop: -24,
    width: CENTER_POST_BUTTON_SIZE,
    height: CENTER_POST_BUTTON_SIZE,
    borderRadius: CENTER_POST_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SELF_LINK_GREEN,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});

const messageHeaderStyles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 2,
  },
});
