import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AuthStackParamList } from '@navigation/types';

export type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export type RegisterDefaultValuesType = {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  handle: string;
};
