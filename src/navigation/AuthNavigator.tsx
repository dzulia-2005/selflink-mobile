import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen, RegisterScreen, SocialLoginScreen } from '@screens/auth';

import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="SocialLogin" component={SocialLoginScreen} />
    </Stack.Navigator>
  );
}
