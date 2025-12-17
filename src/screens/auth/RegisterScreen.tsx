import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isAxiosError } from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { AuthStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { theme } from '@theme';

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<Navigation>();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const register = useAuthStore((state) => state.register);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);
  const error = useAuthStore((state) => state.error);
  const setError = useAuthStore((state) => state.setError);

  const handleSubmit = useCallback(async () => {
    if (!name || !email || !password || !handle) {
      Alert.alert('Missing info', 'Please fill all required fields.');
      return;
    }
    try {
      await register({
        email,
        password,
        name,
        handle: handle || undefined,
        username: handle || undefined,
      });
    } catch (err) {
      if (__DEV__) {
        if (isAxiosError(err)) {
          console.debug('register failed: response', {
            status: err.response?.status,
            data: err.response?.data,
          });
          console.debug('register failed: request', {
            baseURL: err.config?.baseURL,
            url: err.config?.url,
            data: err.config?.data,
          });
        } else {
          console.debug('register failed: non-axios error', err);
        }
      }
      console.warn('register failed', err);
    }
  }, [name, email, handle, password, register]);

  const handleNavigateLogin = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <LinearGradient colors={theme.gradients.matrix} style={styles.cardAccent} />
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Define your handle and sync your personal matrix.
            </Text>
            <TextInput
              placeholder="Full name"
              placeholderTextColor={theme.text.muted}
              style={styles.input}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) {
                  setError(null);
                }
              }}
            />
            <TextInput
              placeholder="Handle"
              placeholderTextColor={theme.text.muted}
              autoCapitalize="none"
              style={styles.input}
              value={handle}
              onChangeText={(text) => {
                setHandle(text);
                if (error) {
                  setError(null);
                }
              }}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor={theme.text.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) {
                  setError(null);
                }
              }}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={theme.text.muted}
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) {
                  setError(null);
                }
              }}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={handleSubmit}
              disabled={isAuthenticating}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={theme.gradients.cta}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, isAuthenticating && styles.buttonDisabled]}
              >
                <Text style={styles.buttonLabel}>
                  {isAuthenticating ? 'Creating…' : 'Create account'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLink} onPress={handleNavigateLogin}>
              <Text style={styles.footerText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
    paddingBottom: theme.spacing.xl * 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  cardAccent: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 160,
    height: 160,
    opacity: 0.18,
    borderRadius: 120,
  },
  title: {
    color: theme.text.primary,
    ...theme.typography.headingL,
  },
  subtitle: {
    color: theme.text.secondary,
    ...theme.typography.body,
  },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    color: theme.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonWrapper: {
    borderRadius: theme.radii.lg,
    ...theme.shadows.button,
  },
  button: {
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: theme.text.primary,
    ...theme.typography.button,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
  },
  footerLink: {
    alignItems: 'center',
  },
  footerText: {
    color: theme.text.secondary,
    ...theme.typography.body,
  },
});
