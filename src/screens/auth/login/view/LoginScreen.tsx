import { zodResolver } from '@hookform/resolvers/zod';
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
    footerLink: {
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    footerText: {
      color: theme.text.secondary,
      ...theme.typography.body,
    },
  });
