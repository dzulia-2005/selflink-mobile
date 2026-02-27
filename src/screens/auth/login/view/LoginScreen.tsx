import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { type AppLanguage, normalizeToBaseLanguage } from '@i18n/language';
import { useAppLanguage } from '@i18n/useAppLanguage';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';

import { LoginDefaultValues } from '../components/loginDefaultValues';
import { createLoginSchema } from '../components/schema';
import { LoginTypes, Navigation } from '../types/index.type';

const APP_LANGUAGES: AppLanguage[] = ['en', 'ru', 'ka'];

export const LoginScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { language, setLanguage } = useAppLanguage();
  const navigation = useNavigation<Navigation>();
  const login = useAuthStore((state) => state.login);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);
  const schema = useMemo(() => createLoginSchema(t), [t]);

  const {control,handleSubmit,formState:{errors}} = useForm({
    defaultValues:LoginDefaultValues,
    resolver:zodResolver(schema),
  });


  const handleSubmitClick = async (payload:LoginTypes) => {
    try {
      await login(payload);
    } catch (error) {
      console.warn('Login Failed', error);
    }
  };

  const handleNavigateRegister = useCallback(() => {
    navigation.navigate('Register');
  }, [navigation]);

  const handleNavigateSocialProvider = useCallback(
    (provider: 'google' | 'facebook' | 'github') => {
      navigation.navigate('SocialLogin', { provider });
    },
    [navigation],
  );

  const handleLanguageChange = useCallback(
    async (value: string) => {
      await setLanguage(normalizeToBaseLanguage(value));
    },
    [setLanguage],
  );

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <LinearGradient colors={theme.gradients.accent} style={styles.cardAccent} />
          <Text style={styles.languageLabel}>{t('profile.language')}</Text>
          <View style={styles.languageRow}>
            {APP_LANGUAGES.map((opt) => {
              const active = language === opt;
              return (
                <Pressable
                  key={opt}
                  style={[styles.languageChip, active && styles.languageChipSelected]}
                  onPress={() => {
                    handleLanguageChange(opt).catch(() => undefined);
                  }}
                >
                  <Text
                    style={[styles.languageChipLabel, active && styles.languageChipLabelSelected]}
                  >
                    {t(`profile.languageOptions.${opt}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Controller
            name="email"
            control={control}
            render={({field:{onChange,value}})=>(
              <TextInput
                placeholder={t('auth.login.emailPlaceholder')}
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
                placeholder={t('auth.login.passwordPlaceholder')}
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
                {isAuthenticating ? t('auth.login.submitting') : t('auth.login.submit')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.socialSection}>
            <Text style={styles.socialLabel}>{t('auth.login.socialLabel')}</Text>
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
            <Text style={styles.footerText}>{t('auth.login.registerLink')}</Text>
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
    languageLabel: {
      color: theme.text.secondary,
      ...theme.typography.caption,
    },
    languageRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      flexWrap: 'wrap',
    },
    languageChip: {
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceAlt,
    },
    languageChipSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: 'rgba(124, 58, 237, 0.15)',
    },
    languageChipLabel: {
      color: theme.text.secondary,
      ...theme.typography.caption,
    },
    languageChipLabelSelected: {
      color: theme.text.primary,
      fontWeight: '700',
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
