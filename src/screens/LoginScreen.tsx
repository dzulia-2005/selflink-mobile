import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { MetalToast } from '@components/MetalToast';
import { useAuth } from '@hooks/useAuth';
import { loginWithPassword } from '@services/api/auth';
import { theme } from '@theme/index';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }
    if (!email || !password) {
      setErrorMessage('Please enter both email and password to continue.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await loginWithPassword({ email, password });
      await signIn(result);
      setErrorMessage(null);
    } catch (error) {
      console.error('Login failed', error);
      setErrorMessage('Login failed. Please verify your credentials and try again.');
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
          <MetalToast
            visible={Boolean(errorMessage)}
            message={errorMessage ?? ''}
            tone="error"
            actionLabel="Dismiss"
            onAction={() => setErrorMessage(null)}
          />
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
          </MetalPanel>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  input: {
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.palette.pearl,
    color: theme.palette.titanium,
    marginBottom: theme.spacing.sm,
  },
});
