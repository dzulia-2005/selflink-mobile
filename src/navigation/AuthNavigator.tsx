import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '@screens/auth/login';
import { RegisterScreen } from '@screens/auth/RegisterScreen';
import { SocialLoginScreen } from '@screens/auth/SocialLoginScreen';

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
