import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BirthDataScreen } from '@screens/astro/BirthDataScreen';
import { NatalChartScreen } from '@screens/astro/NatalChartScreen';
import { CreatePostScreen } from '@screens/feed/CreatePostScreen';
import { FeedScreen } from '@screens/feed/FeedScreen';
import { PostDetailsScreen } from '@screens/feed/PostDetailsScreen';
import { DailyMentorEntryScreen } from '@screens/mentor/DailyMentorEntryScreen';
import { DailyMentorScreen } from '@screens/mentor/DailyMentorScreen';
import { MentorChatScreen } from '@screens/mentor/MentorChatScreen';
import { MentorHomeScreen } from '@screens/mentor/MentorHomeScreen';
import { NatalMentorScreen } from '@screens/mentor/NatalMentorScreen';
import { ChatScreen } from '@screens/messaging/ChatScreen';
import { ThreadsScreen } from '@screens/messaging/ThreadsScreen';
import { PaymentsScreen } from '@screens/PaymentsScreen';
import { CommunityScreen } from '@screens/CommunityScreen';
import { InboxScreen } from '@screens/InboxScreen';
import { NotificationsScreen } from '@screens/notifications/NotificationsScreen';
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

const MessagesHeader = () => <TopBar title="Messages" />;

function FeedStackNavigator() {
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
        options={{ title: 'Post' }}
      />
      <FeedStack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: 'New Post' }}
      />
      <FeedStack.Screen
        name="SearchProfiles"
        component={SearchProfilesScreen}
        options={{ title: 'Search Profiles' }}
      />
      <FeedStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: 'Profile' }}
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
        options={({ navigation }) => ({
          title: 'Messages',
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Threads')}
              style={messageHeaderStyles.backButton}
            >
              <Ionicons name="chevron-back" size={20} color={theme.text.primary} />
              <Text style={[messageHeaderStyles.backText, { color: theme.text.primary }]}>
                Threads
              </Text>
            </TouchableOpacity>
          ),
        })}
      />
    </MessagesStack.Navigator>
  );
}

function ProfileStackNavigator() {
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
        options={{ title: 'Search Profiles' }}
      />
      <ProfileStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: 'Edit Profile' }}
      />
      <ProfileStack.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{ title: 'Payments' }}
      />
      <ProfileStack.Screen
        name="WalletLedger"
        component={WalletLedgerScreen}
        options={{ title: 'Wallet' }}
      />
      <ProfileStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <ProfileStack.Screen
        name="Community"
        component={CommunityScreen}
        options={{ title: 'Community' }}
      />
      <ProfileStack.Screen
        name="Inbox"
        component={InboxScreen}
        options={{ title: 'Inbox' }}
      />
    </ProfileStack.Navigator>
  );
}

function MentorStackNavigator() {
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
        options={{ title: 'Birth Data' }}
      />
      <MentorStack.Screen
        name="NatalChart"
        component={NatalChartScreen}
        options={{ title: 'Natal Chart' }}
      />
      <MentorStack.Screen
        name="NatalMentor"
        component={NatalMentorScreen}
        options={{ title: 'Natal Mentor' }}
      />
      <MentorStack.Screen
        name="DailyMentor"
        component={DailyMentorScreen}
        options={{ title: 'Daily Mentor' }}
      />
      <MentorStack.Screen
        name="DailyMentorEntry"
        component={DailyMentorEntryScreen}
        options={{ title: 'Daily Entry' }}
      />
      <MentorStack.Screen
        name="MentorChat"
        component={MentorChatScreen}
        options={{ title: 'AI Mentor' }}
      />
    </MentorStack.Navigator>
  );
}

function SoulMatchStackNavigator() {
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
        options={{ title: 'SoulMatch Recommendations' }}
      />
      <SoulMatchStack.Screen
        name="SoulMatchDetail"
        component={SoulMatchDetailsScreen}
        options={{ title: 'SoulMatch' }}
      />
      <SoulMatchStack.Screen
        name="SoulMatchMentor"
        component={SoulMatchMentorScreen}
        options={{ title: 'SoulMatch Mentor' }}
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
          tabBarButton: (props) => {
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={props.onPress ?? undefined}
                onLongPress={props.onLongPress ?? undefined}
                accessibilityRole={props.accessibilityRole}
                accessibilityState={props.accessibilityState}
                accessibilityLabel={props.accessibilityLabel}
                testID={props.testID}
                style={[
                  props.style,
                  {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <View
                  style={{
                    marginTop: -24,
                    width: CENTER_POST_BUTTON_SIZE,
                    height: CENTER_POST_BUTTON_SIZE,
                    borderRadius: CENTER_POST_BUTTON_SIZE / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: SELF_LINK_GREEN,
                    borderWidth: 3,
                    borderColor: theme.colors.background,
                    shadowColor: '#000',
                    shadowOpacity: 0.28,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 10,
                  }}
                >
                  <Ionicons name="add" size={34} color={theme.text.inverted} />
                </View>
              </TouchableOpacity>
            );
          },
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
