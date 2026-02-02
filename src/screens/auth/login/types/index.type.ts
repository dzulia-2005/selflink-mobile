import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AuthStackParamList } from '@navigation/types';

export type LoginTypes = {
  email: string;
  password: string;
};

export type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
