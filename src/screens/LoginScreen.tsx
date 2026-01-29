import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import { useAuth } from '@hooks/useAuth';
import type { AuthStackParamList } from '@navigation/types';
import { loginWithPassword } from '@services/api/auth';
import { useTheme, type Theme } from '@theme';

type LoginScreenNavigation = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { signIn } = useAuth();
  const navigation = useNavigation<LoginScreenNavigation>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }
    if (!email || !password) {
      toast.push({
        message: 'Please enter both email and password to continue.',
        tone: 'error',
        duration: 4000,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await loginWithPassword({ email, password });
      await signIn(result);
    } catch (error) {
      console.error('Login failed', error);
      toast.push({
        message: 'Login failed. Please verify your credentials and try again.',
        tone: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Text style={styles.headline}>Welcome to Selflink</Text>
          <Text style={styles.subtitle}>
            Sign in to unlock your mentor, SoulMatch, and premium social experiences.
            Inspired by the brushed-aluminum glow of early Apple design.
          </Text>

          <MetalPanel glow>
            <Text style={styles.panelTitle}>Sign In</Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor={theme.palette.silver}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={theme.palette.silver}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            <MetalButton
              title={isSubmitting ? 'Signing In…' : 'Sign In'}
              onPress={handleLogin}
            />
            <View style={styles.secondaryCta}>
              <Text style={styles.secondaryText}>New to Selflink?</Text>
              <MetalButton
                title="Create Account"
                onPress={() => navigation.navigate('Register')}
              />
            </View>
          </MetalPanel>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.lg,
    justifyContent: 'center',
  },
  headline: {
    color: theme.palette.platinum,
    ...theme.typography.title,
  },
  subtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  panelTitle: {
    color: theme.palette.titanium,
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.md,
  },
  secondaryCta: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  secondaryText: {
    color: theme.palette.silver,
    textAlign: 'center',
  },
  input: {
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.palette.pearl,
    color: theme.palette.titanium,
    marginBottom: theme.spacing.sm,
  },
  });
