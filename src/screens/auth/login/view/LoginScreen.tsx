import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';

import { LoginDefaultValues } from '../components/loginDefaultValues';
import { LoginSchema } from '../components/schema';
import { LoginTypes, Navigation } from '../types/index.type';



export const LoginScreen = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const login = useAuthStore((state) => state.login);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);

  const {control,handleSubmit,formState:{errors}} = useForm({
    defaultValues:LoginDefaultValues,
    resolver:zodResolver(LoginSchema),
  });


  const handleSubmitClick = async (payload:LoginTypes) => {
    try {
      await login(payload);
    } catch (error) {
      console.warn('Login Failed',error);
    }
  };

  const handleNavigateRegister = useCallback(() => {
    navigation.navigate('Register');
  }, [navigation]);

  const handleNavigateSocialLogin = useCallback(() => {
    navigation.navigate('SocialLogin');
  }, [navigation]);

  const handleNavigateSocialProvider = useCallback(
    (provider: 'google' | 'facebook' | 'github') => {
      navigation.navigate('SocialLogin', { provider });
    },
    [navigation],
  );

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <LinearGradient colors={theme.gradients.accent} style={styles.cardAccent} />
          {/* <Text style={styles.title}>Welcome back</Text> */}
          {/* <Text style={styles.subtitle}>Sign in to continue to SelfLink</Text> */}

          <Controller
            name="email"
            control={control}
            render={({field:{onChange,value}})=>(
              <TextInput
                placeholder="Email"
                placeholderTextColor={theme.text.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email.message}</Text> : null}

          <Controller
            name="password"
            control={control}
            render={({field:{onChange,value}})=>(
              <TextInput
                placeholder="Password"
                placeholderTextColor={theme.text.muted}
                secureTextEntry
                style={styles.input}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password.message}</Text> : null}

          <TouchableOpacity
            style={styles.buttonWrapper}
            disabled={isAuthenticating}
            activeOpacity={0.9}
            onPress={handleSubmit(handleSubmitClick)}
          >
            <LinearGradient
              colors={theme.gradients.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.button, isAuthenticating && styles.buttonDisabled]}
            >
              <Text style={styles.buttonLabel}>
                {isAuthenticating ? 'Signing in…' : 'Log in'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.socialSection}>
            <Text style={styles.socialLabel}>Or continue with</Text>
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleNavigateSocialProvider('google')}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-google" size={20} color={theme.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleNavigateSocialProvider('facebook')}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-facebook" size={20} color={theme.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleNavigateSocialProvider('github')}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-github" size={20} color={theme.text.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.footerLink} onPress={handleNavigateRegister}>
            <Text style={styles.footerText}>Registration</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default LoginScreen;

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
    socialSection: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    socialLabel: {
      color: theme.text.secondary,
      ...theme.typography.body,
    },
    socialRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.md,
    },
    socialButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
