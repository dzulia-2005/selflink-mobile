import { AuthStackParamList } from "@navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export type RegisterDefaultValuesType = {
  email: string;
  password: string;
  name: string;
  handle: string;
};
