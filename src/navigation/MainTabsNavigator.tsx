import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import type { ColorValue, StyleProp, TextStyle } from 'react-native';

import { CreatePostScreen } from '@screens/feed/CreatePostScreen';
import { FeedScreen } from '@screens/feed/FeedScreen';
import { PostDetailsScreen } from '@screens/feed/PostDetailsScreen';
import { MentorHomeScreen } from '@screens/mentor/MentorHomeScreen';
import { ChatScreen } from '@screens/messaging/ChatScreen';
import { ThreadsScreen } from '@screens/messaging/ThreadsScreen';
import { NotificationsScreen } from '@screens/notifications/NotificationsScreen';
import { ProfileScreen } from '@screens/profile/ProfileScreen';
import { SearchProfilesScreen } from '@screens/profile/SearchProfilesScreen';
import { UserProfileScreen } from '@screens/profile/UserProfileScreen';
import { useMessagingStore } from '@store/messagingStore';

import type {
  MainTabsParamList,
  FeedStackParamList,
  MessagesStackParamList,
  ProfileStackParamList,
} from './types';

const SELF_LINK_BLUE = '#2563EB';
const SELF_LINK_GREEN = '#16a34a';
const TAB_BAR_BG = '#020617';

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
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: SELF_LINK_BLUE,
          shadowOpacity: 0.25,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
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
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}
