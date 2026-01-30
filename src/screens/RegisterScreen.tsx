import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import { useAuth } from '@hooks/useAuth';
import { registerUser } from '@services/api/auth';
import { useTheme, type Theme } from '@theme';

export function RegisterScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { signIn } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (isSubmitting) {
      return;
    }
    if (!email || !password || !confirmPassword || !handle || !name) {
      toast.push({
        message: 'Please fill out all required fields.',
        tone: 'error',
        duration: 4000,
      });
      return;
    }
    if (password !== confirmPassword) {
      toast.push({
        message: 'Passwords do not match.',
        tone: 'error',
        duration: 4000,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await registerUser({
        name,
        email,
        password,
        handle,
        username: handle || undefined,
      });
      await signIn(result);
      toast.push({ message: 'Welcome to Selflink!', tone: 'info', duration: 3000 });
    } catch (error) {
      console.error('Registration failed', error);
      toast.push({
        message: 'Registration failed. Please try again.',
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headline}>Create Your Selflink Account</Text>
          <Text style={styles.subtitle}>
            Metallic gradients, rounded edges, and a thoughtful experience from the first
            tap.
          </Text>

          <MetalPanel glow>
            <Text style={styles.panelTitle}>Sign Up</Text>
            <TextInput
              placeholder="Display Name"
              placeholderTextColor={theme.palette.silver}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              placeholder="Handle"
              placeholderTextColor={theme.palette.silver}
              autoCapitalize="none"
              value={handle}
              onChangeText={setHandle}
              style={styles.input}
            />
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
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor={theme.palette.silver}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
            />
            <MetalButton
              title={isSubmitting ? 'Creating Account…' : 'Create Account'}
              onPress={handleRegister}
            />
          </MetalPanel>
        </ScrollView>
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
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
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
