import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';

import { useAuthHydration } from '@hooks/useAuthHydration';
import { useMessagingSync } from '@hooks/useMessagingSync';
import  PersonalMapScreen  from '@screens/onboarding/index';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@theme';

import { AuthNavigator } from './AuthNavigator';
import { MainTabsNavigator } from './MainTabsNavigator';
import type { OnboardingStackParamList, RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator>
      <OnboardingStack.Screen
        name="PersonalMap"
        component={PersonalMapScreen}
        options={{ title: 'Complete your personal map' }}
      />
    </OnboardingStack.Navigator>
  );
}

function SplashScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.splashContainer, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.text.primary} />
      <Text style={[styles.splashText, { color: theme.text.primary }]}>
        Preparing SelfLink…
      </Text>
    </View>
  );
}

export function RootNavigator() {
  const { resolved, theme } = useTheme();
  const isHydrated = useAuthHydration();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasCompletedPersonalMap = useAuthStore((state) => state.hasCompletedPersonalMap);

  const isAuthenticated = Boolean(accessToken);
  const needsOnboarding = isAuthenticated && !hasCompletedPersonalMap;
  const shouldSyncMessaging = isHydrated && isAuthenticated && !needsOnboarding;
  useMessagingSync(shouldSyncMessaging);

  const navigationTheme = useMemo(() => {
    const base = resolved === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.text.primary,
        border: theme.colors.border,
        primary: theme.colors.primary,
      },
    };
  }, [resolved, theme]);

  if (!isHydrated) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated && <RootStack.Screen name="Auth" component={AuthNavigator} />}
        {needsOnboarding && (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
        {isAuthenticated && !needsOnboarding && (
          <RootStack.Screen name="Main" component={MainTabsNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    marginTop: 12,
    fontSize: 16,
  },
});
