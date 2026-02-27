import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { type AppLanguage } from '@i18n/language';
import { useAppLanguage } from '@i18n/useAppLanguage';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';

import { RegisterDefaultValues } from '../components/registerDefaultValues';
import { createRegisterSchema } from '../components/schema';
import { Navigation, RegisterDefaultValuesType } from '../types/index.type';

const APP_LANGUAGES: AppLanguage[] = ['en', 'ru', 'ka'];

const RegisterScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { language, setLanguage } = useAppLanguage();
  const navigation = useNavigation<Navigation>();
  const register = useAuthStore((state) => state.register);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);
  const schema = useMemo(() => createRegisterSchema(t), [t]);

  const {handleSubmit,control,formState:{errors}} = useForm({
    defaultValues: RegisterDefaultValues,
    resolver:zodResolver(schema),
  });

  const handleSubmitClick = async(payload:RegisterDefaultValuesType) => {
    const registerPayload = {
      ...payload,
    };
    delete (registerPayload as Partial<RegisterDefaultValuesType>).confirmPassword;
    try {
      await register(registerPayload);
    } catch (error) {
      console.warn('register failed', error);
    }
  };


  const handleNavigateLogin = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNavigateSocialLogin = useCallback(() => {
    navigation.navigate('SocialLogin');
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
            <Text style={styles.languageLabel}>{t('profile.language')}</Text>
            <View style={styles.languageRow}>
              {APP_LANGUAGES.map((opt) => {
                const active = language === opt;
                return (
                  <Pressable
                    key={opt}
                    style={[styles.languageChip, active && styles.languageChipSelected]}
                    onPress={() => {
                      setLanguage(opt).catch(() => undefined);
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
            <Text style={styles.title}>{t('auth.register.title')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.register.subtitle')}
            </Text>
            <Controller
              name="name"
              control={control}
              render={({field:{onChange,value}})=>(
                <TextInput
                  placeholder={t('auth.register.fullNamePlaceholder')}
                  placeholderTextColor={theme.text.muted}
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name.message}</Text> : null}

            <Controller
              name="handle"
              control={control}
              render={({field:{onChange,value}})=>(
                <TextInput
                  placeholder={t('auth.register.usernamePlaceholder')}
                  placeholderTextColor={theme.text.muted}
                  autoCapitalize="none"
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
              />
              )}
            />
            {errors.handle ? <Text style={styles.errorText}>{errors.handle.message}</Text> : null}


            <Controller
              name="email"
              control={control}
              render={({field:{onChange,value}})=>(
                <TextInput
                  placeholder={t('auth.register.emailPlaceholder')}
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
                  placeholder={t('auth.register.passwordPlaceholder')}
                  placeholderTextColor={theme.text.muted}
                  secureTextEntry
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password.message}</Text> : null}

            <Controller
              name="confirmPassword"
              control={control}
              render={({field:{onChange,value}})=>(
                <TextInput
                  placeholder={t('auth.register.confirmPasswordPlaceholder')}
                  placeholderTextColor={theme.text.muted}
                  secureTextEntry
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
            ) : null}
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
                  {isAuthenticating
                    ? t('auth.register.submitting')
                    : t('auth.register.submit')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLink} onPress={handleNavigateLogin}>
              <Text style={styles.footerText}>{t('auth.register.signInLink')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLink} onPress={handleNavigateSocialLogin}>
              <Text style={styles.footerText}>{t('auth.register.socialLink')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default RegisterScreen;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xl,
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
