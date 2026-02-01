import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { AuthStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((state) => state.login);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);
  const error = useAuthStore((state) => state.error);
  const setError = useAuthStore((state) => state.setError);

  const handleSubmit = useCallback(async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }
    try {
      await login({ email, password });
    } catch (err) {
      console.warn('login failed', err);
    }
  }, [email, password, login]);

  const handleNavigateRegister = useCallback(() => {
    navigation.navigate('Register');
  }, [navigation]);

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <LinearGradient colors={theme.gradients.accent} style={styles.cardAccent} />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue to SelfLink</Text>
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
                {isAuthenticating ? 'Signing in…' : 'Sign in'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerLink} onPress={handleNavigateRegister}>
            <Text style={styles.footerText}>Need an account? Create one</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: theme.spacing.xl,
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
      right: -60,
      width: 180,
      height: 180,
      opacity: 0.15,
      borderRadius: 90,
    },
    title: {
      color: theme.text.primary,
      ...theme.typography.headingL,
    },
    subtitle: {
      color: theme.text.secondary,
      ...theme.typography.subtitle,
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
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.lg,
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
      marginTop: theme.spacing.md,
    },
    footerText: {
      color: theme.text.secondary,
      ...theme.typography.body,
    },
  });
