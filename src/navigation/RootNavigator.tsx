import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme, ActivityIndicator, StyleSheet, View, Text } from 'react-native';

import { useAuthHydration } from '@hooks/useAuthHydration';
import { useMessagingSync } from '@hooks/useMessagingSync';
import { PersonalMapScreen } from '@screens/onboarding/PersonalMapScreen';
import { useAuthStore } from '@store/authStore';

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
  return (
    <View style={styles.splashContainer}>
      <ActivityIndicator size="large" />
      <Text style={styles.splashText}>Preparing SelfLink…</Text>
    </View>
  );
}

export function RootNavigator() {
  const colorScheme = useColorScheme();
  const isHydrated = useAuthHydration();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasCompletedPersonalMap = useAuthStore((state) => state.hasCompletedPersonalMap);

  const isAuthenticated = Boolean(accessToken);
  const needsOnboarding = isAuthenticated && !hasCompletedPersonalMap;
  const shouldSyncMessaging = isHydrated && isAuthenticated && !needsOnboarding;
  useMessagingSync(shouldSyncMessaging);

  if (!isHydrated) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
