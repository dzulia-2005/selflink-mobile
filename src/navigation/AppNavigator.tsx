import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { enableScreens } from 'react-native-screens';

import { useAuth } from '@hooks/useAuth';
import { CommunityScreen } from '@screens/CommunityScreen';
import { HomeScreen } from '@screens/HomeScreen';
import { InboxScreen } from '@screens/InboxScreen';
import { LoginScreen } from '@screens/LoginScreen';
import { MentorScreen } from '@screens/MentorScreen';
import { MessagesScreen } from '@screens/MessagesScreen';
import { PaymentsScreen } from '@screens/PaymentsScreen';
import { ProfileScreen } from '@screens/ProfileScreen';
import { RegisterScreen } from '@screens/RegisterScreen';
import { SoulMatchScreen } from '@screens/SoulMatchScreen';
import { ToastContainer } from '@screens/ToastContainer';
import { WalletLedgerScreen } from '@screens/WalletLedgerScreen';
import { theme } from '@theme/index';

enableScreens(true);

export type RootStackParamList = {
  Home: undefined;
  Community: undefined;
  Inbox: undefined;
  Messages: { threadId: number };
  Mentor: undefined;
  SoulMatch: undefined;
  Payments: undefined;
  Profile: undefined;
  WalletLedger: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.palette.midnight,
    text: theme.palette.platinum,
    border: 'transparent',
  },
};

export function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'android') {
      // Enable experimental layout anims once per platform
      import('react-native-reanimated').catch(() => undefined);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.palette.platinum} size="large" />
        <Text style={styles.loadingText}>Preparing Selflink…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <ToastContainer />
      {isAuthenticated ? (
        <Stack.Navigator
          screenOptions={{
            headerTransparent: true,
            headerTintColor: theme.palette.platinum,
            headerTitleStyle: {
              ...theme.typography.subtitle,
              color: theme.palette.platinum,
            },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="Community"
            component={CommunityScreen}
            options={{ headerTitle: 'Community' }}
          />
          <Stack.Screen
            name="Inbox"
            component={InboxScreen}
            options={{ headerTitle: 'Inbox' }}
          />
          <Stack.Screen
            name="Messages"
            component={MessagesScreen}
            options={{ headerTitle: 'Messages' }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ headerTitle: 'Profile' }}
          />
          <Stack.Screen
            name="Mentor"
            component={MentorScreen}
            options={{ headerTitle: 'Mentor Session' }}
          />
          <Stack.Screen
            name="SoulMatch"
            component={SoulMatchScreen}
            options={{ headerTitle: 'SoulMatch' }}
          />
          <Stack.Screen
            name="Payments"
            component={PaymentsScreen}
            options={{ headerTitle: 'Payments & Wallet' }}
          />
          <Stack.Screen
            name="WalletLedger"
            component={WalletLedgerScreen}
            options={{ headerTitle: 'Wallet Ledger' }}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack.Navigator
          screenOptions={{
            headerTransparent: true,
            headerTintColor: theme.palette.platinum,
            headerTitleStyle: {
              ...theme.typography.subtitle,
              color: theme.palette.platinum,
            },
          }}
        >
          <AuthStack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <AuthStack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerTitle: 'Create Account' }}
          />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
});
