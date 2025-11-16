import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ColorValue, StyleProp, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityScreen } from '@screens/CommunityScreen';
import { CreatePostScreen } from '@screens/feed/CreatePostScreen';
import { FeedScreen } from '@screens/feed/FeedScreen';
import { PostDetailsScreen } from '@screens/feed/PostDetailsScreen';
import { InboxScreen } from '@screens/InboxScreen';
import { MentorHomeScreen } from '@screens/mentor/MentorHomeScreen';
import { ChatScreen } from '@screens/messaging/ChatScreen';
import { ThreadsScreen } from '@screens/messaging/ThreadsScreen';
import { NotificationsScreen } from '@screens/notifications/NotificationsScreen';
import { PaymentsScreen } from '@screens/PaymentsScreen';
import { ProfileScreen } from '@screens/profile/ProfileScreen';
import { SearchProfilesScreen } from '@screens/profile/SearchProfilesScreen';
import { UserProfileScreen } from '@screens/profile/UserProfileScreen';
import { SoulMatchScreen } from '@screens/SoulMatchScreen';
import { WalletLedgerScreen } from '@screens/WalletLedgerScreen';
import { useMessagingStore } from '@store/messagingStore';

import type {
  MainTabsParamList,
  FeedStackParamList,
  MessagesStackParamList,
  ProfileStackParamList,
} from './types';

const SELF_LINK_GREEN = '#16a34a';
const TAB_BAR_BG = '#020617';
const TAB_BAR_BORDER = '#1E1B4B';

export const MESSAGE_BADGE_STYLE: StyleProp<TextStyle> = {
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  paddingHorizontal: 4,
  lineHeight: 20,
  textAlign: 'center',
  fontSize: 12,
  fontWeight: '700',
  color: '#fff',
  backgroundColor: SELF_LINK_GREEN,
};

const Tab = createBottomTabNavigator<MainTabsParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

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
    case 'SoulMatch':
      return focused ? 'heart' : 'heart-outline';
    case 'Payments':
      return focused ? 'card' : 'card-outline';
    case 'WalletLedger':
      return focused ? 'wallet' : 'wallet-outline';
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

function FeedStackNavigator() {
  return (
    <FeedStack.Navigator>
      <FeedStack.Screen
        name="FeedHome"
        component={FeedScreen}
        options={{ headerTitle: 'Feed' }}
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
    </FeedStack.Navigator>
  );
}

function MessagesStackNavigator() {
  return (
    <MessagesStack.Navigator>
      <MessagesStack.Screen
        name="Threads"
        component={ThreadsScreen}
        options={{ headerShown: false }}
      />
      <MessagesStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Messages' }}
      />
    </MessagesStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator>
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
    </ProfileStack.Navigator>
  );
}

export function MainTabsNavigator() {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 12);
  const tabHeight = 56 + safeBottom;
  const totalUnread = useMessagingStore((state) => state.totalUnread);
  const messagesOptions = useMemo(() => {
    const badge =
      totalUnread > 0 ? (totalUnread > 99 ? '99+' : String(totalUnread)) : undefined;
    return {
      tabBarBadge: badge,
      tabBarBadgeStyle: badge ? MESSAGE_BADGE_STYLE : undefined,
      headerShown: false,
    };
  }, [totalUnread]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: SELF_LINK_GREEN,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: TAB_BAR_BG,
          borderTopColor: TAB_BAR_BORDER,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabHeight,
          paddingBottom: safeBottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
        tabBarIcon: createTabBarIcon(route.name),
      })}
    >
      <Tab.Screen name="Feed" component={FeedStackNavigator} />
      <Tab.Screen
        name="Messages"
        component={MessagesStackNavigator}
        options={messagesOptions}
      />
      <Tab.Screen name="Mentor" component={MentorHomeScreen} />
      <Tab.Screen name="SoulMatch" component={SoulMatchScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="WalletLedger" component={WalletLedgerScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}
