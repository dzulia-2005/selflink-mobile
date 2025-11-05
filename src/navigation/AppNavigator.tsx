import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';

import { HomeScreen } from '@screens/HomeScreen';
import { MentorScreen } from '@screens/MentorScreen';
import { PaymentsScreen } from '@screens/PaymentsScreen';
import { SoulMatchScreen } from '@screens/SoulMatchScreen';
import { theme } from '@theme/index';

enableScreens(true);

export type RootStackParamList = {
  Home: undefined;
  Mentor: undefined;
  SoulMatch: undefined;
  Payments: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Enable experimental layout anims once per platform
      import('react-native-reanimated').catch(() => undefined);
    }
  }, []);

  return (
    <NavigationContainer theme={navigationTheme}>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
