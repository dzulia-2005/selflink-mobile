import { RouteProp, useRoute } from '@react-navigation/native';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { type AppLanguage } from '@i18n/language';
import { useAppLanguage } from '@i18n/useAppLanguage';
import type { AuthStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const GITHUB_DISCOVERY = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
};

const FACEBOOK_DISCOVERY = {
  authorizationEndpoint: 'https://www.facebook.com/dialog/oauth',
  tokenEndpoint: 'https://graph.facebook.com/oauth/access_token',
};

type SocialLoginRoute = RouteProp<AuthStackParamList, 'SocialLogin'>;
const APP_LANGUAGES: AppLanguage[] = ['en', 'ru', 'ka'];

export function SocialLoginScreen() {
  const { t } = useTranslation();
  const route = useRoute<SocialLoginRoute>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { language, setLanguage } = useAppLanguage();
  const socialLogin = useAuthStore((state) => state.socialLogin);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);
  const [error, setError] = useState<string | null>(null);
  const autoStartedProviderRef = useRef<'google' | 'facebook' | 'github' | null>(null);
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
  const githubClientId = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID?.trim() ?? '';
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim() ?? '';
  const isGoogleConfigured = googleClientId.length > 0;
  const isGitHubConfigured = githubClientId.length > 0;
  const isFacebookConfigured = facebookAppId.length > 0;
  const projectFullName = useMemo(() => {
    const owner = Constants.expoConfig?.owner;
    const slug = Constants.expoConfig?.slug;
    return owner && slug ? `@${owner}/${slug}` : null;
  }, []);
  // Expo Go uses auth.expo.io proxy. Production/dev-client should use a custom app scheme.
  const proxyRedirectUri = useMemo(
    () => (projectFullName ? `https://auth.expo.io/${projectFullName}` : null),
    [projectFullName],
  );
  const redirectUri = proxyRedirectUri ?? 'https://auth.expo.io/@missing/missing';

  const [googleRequest, googleResponse, googlePromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleClientId || 'missing-google-client-id',
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false,
      extraParams: {
        prompt: 'select_account',
      },
    },
    GOOGLE_DISCOVERY,
  );

  const [githubRequest, githubResponse, githubPromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: githubClientId || 'missing-github-client-id',
      redirectUri,
      scopes: ['read:user', 'user:email'],
      responseType: AuthSession.ResponseType.Code,
    },
    GITHUB_DISCOVERY,
  );

  const [facebookRequest, facebookResponse, facebookPromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: facebookAppId || 'missing-facebook-app-id',
      redirectUri,
      scopes: ['email', 'public_profile'],
      responseType: AuthSession.ResponseType.Code,
    },
    FACEBOOK_DISCOVERY,
  );

  useEffect(() => {
    if (!googleResponse) {
      return;
    }
    if (googleResponse.type === 'error') {
      setError(googleResponse.error?.message ?? t('auth.social.googleFail'));
      return;
    }
    if (googleResponse.type !== 'success') {
      return;
    }
    const run = async () => {
      setError(null);
      try {
        const idToken = googleResponse.params?.id_token;
        const code = googleResponse.params?.code;
        if (idToken) {
          await socialLogin('google', { idToken });
          return;
        }
        if (code) {
          await socialLogin('google', { code });
          return;
        }
        setError(t('auth.social.googleNoCredential'));
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth.social.googleUnable'));
      }
    };
    run().catch(() => undefined);
  }, [googleResponse, socialLogin, t]);

  useEffect(() => {
    if (!githubResponse) {
      return;
    }
    if (githubResponse.type === 'error') {
      setError(githubResponse.error?.message ?? t('auth.social.githubFail'));
      return;
    }
    if (githubResponse.type !== 'success') {
      return;
    }
    const run = async () => {
      setError(null);
      try {
        const code = githubResponse.params?.code;
        if (!code) {
          setError(t('auth.social.githubNoCode'));
          return;
        }
        await socialLogin('github', { code });
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth.social.githubUnable'));
      }
    };
    run().catch(() => undefined);
  }, [githubResponse, socialLogin, t]);

  useEffect(() => {
    if (!facebookResponse) {
      return;
    }
    if (facebookResponse.type === 'error') {
      setError(facebookResponse.error?.message ?? t('auth.social.facebookFail'));
      return;
    }
    if (facebookResponse.type !== 'success') {
      return;
    }
    const run = async () => {
      setError(null);
      try {
        const code = facebookResponse.params?.code;
        if (!code) {
          setError(t('auth.social.facebookNoCode'));
          return;
        }
        await socialLogin('facebook', { code });
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth.social.facebookUnable'));
      }
    };
    run().catch(() => undefined);
  }, [facebookResponse, socialLogin, t]);

  const handleGoogleLogin = useCallback(async () => {
    setError(null);
    if (!proxyRedirectUri) {
      setError(t('auth.social.missingProjectConfig'));
      return;
    }
    if (!isGoogleConfigured) {
      setError(t('auth.social.googleClientMissing'));
      return;
    }
    if (!googleRequest) {
      setError(t('auth.social.googleNotReady'));
      return;
    }
    await googlePromptAsync();
  }, [
    googlePromptAsync,
    googleRequest,
    isGoogleConfigured,
    proxyRedirectUri,
    t,
  ]);

  const handleGitHubLogin = useCallback(async () => {
    setError(null);
    if (!proxyRedirectUri) {
      setError(t('auth.social.missingProjectConfig'));
      return;
    }
    if (!isGitHubConfigured) {
      setError(t('auth.social.githubClientMissing'));
      return;
    }
    if (!githubRequest) {
      setError(t('auth.social.githubNotReady'));
      return;
    }
    await githubPromptAsync();
  }, [
    githubPromptAsync,
    githubRequest,
    isGitHubConfigured,
    proxyRedirectUri,
    t,
  ]);

  const handleFacebookLogin = useCallback(async () => {
    setError(null);
    if (!proxyRedirectUri) {
      setError(t('auth.social.missingProjectConfig'));
      return;
    }
    if (!isFacebookConfigured) {
      setError(t('auth.social.facebookAppMissing'));
      return;
    }
    if (!facebookRequest) {
      setError(t('auth.social.facebookNotReady'));
      return;
    }
    await facebookPromptAsync();
  }, [
    facebookPromptAsync,
    facebookRequest,
    isFacebookConfigured,
    proxyRedirectUri,
    t,
  ]);

  useEffect(() => {
    const provider = route.params?.provider;
    if (!provider) {
      return;
    }
    if (autoStartedProviderRef.current === provider) {
      return;
    }
    if (isAuthenticating) {
      return;
    }

    const canStart =
      provider === 'google'
        ? Boolean(googleRequest)
        : provider === 'facebook'
          ? Boolean(facebookRequest)
          : Boolean(githubRequest);

    if (!canStart) {
      return;
    }

    autoStartedProviderRef.current = provider;
    const run =
      provider === 'google'
        ? handleGoogleLogin
        : provider === 'facebook'
          ? handleFacebookLogin
          : handleGitHubLogin;
    run().catch(() => undefined);
  }, [
    route.params?.provider,
    isAuthenticating,
    googleRequest,
    facebookRequest,
    githubRequest,
    handleGoogleLogin,
    handleFacebookLogin,
    handleGitHubLogin,
  ]);

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.card}>
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
          <Text style={styles.title}>{t('auth.social.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.social.subtitle')}</Text>
          {!proxyRedirectUri ? (
            <Text style={styles.errorText}>{t('auth.social.missingProjectConfig')}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, (isAuthenticating || !googleRequest) && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isAuthenticating || !googleRequest || !proxyRedirectUri}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonLabel}>
              {isAuthenticating
                ? t('auth.login.submitting')
                : !googleRequest
                  ? t('auth.social.preparingGoogle')
                  : t('auth.social.continueGoogle')}
            </Text>
          </TouchableOpacity>
          {!isGoogleConfigured ? (
            <Text style={styles.infoText}>
              {t('auth.social.providerNotConfiguredGoogle')}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, styles.buttonAlt, (isAuthenticating || !facebookRequest) && styles.buttonDisabled]}
            onPress={handleFacebookLogin}
            disabled={isAuthenticating || !facebookRequest || !proxyRedirectUri}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonAltLabel}>
              {isAuthenticating
                ? t('auth.login.submitting')
                : !facebookRequest
                  ? t('auth.social.preparingFacebook')
                  : t('auth.social.continueFacebook')}
            </Text>
          </TouchableOpacity>
          {!isFacebookConfigured ? (
            <Text style={styles.infoText}>
              {t('auth.social.providerNotConfiguredFacebook')}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, styles.buttonAlt, (isAuthenticating || !githubRequest) && styles.buttonDisabled]}
            onPress={handleGitHubLogin}
            disabled={isAuthenticating || !githubRequest || !proxyRedirectUri}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonAltLabel}>
              {isAuthenticating
                ? t('auth.login.submitting')
                : !githubRequest
                  ? t('auth.social.preparingGithub')
                  : t('auth.social.continueGithub')}
            </Text>
          </TouchableOpacity>
          {!isGitHubConfigured ? (
            <Text style={styles.infoText}>
              {t('auth.social.providerNotConfiguredGithub')}
            </Text>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.infoText}>
            {t('auth.social.redirectHint', {
              project: projectFullName ?? '@owner/slug',
            })}
          </Text>
        </View>
      </View>
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
      gap: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    title: {
      ...theme.typography.headingM,
      color: theme.text.primary,
    },
    subtitle: {
      color: theme.text.muted,
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
    button: {
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonLabel: {
      color: theme.text.inverted,
      ...theme.typography.button,
    },
    buttonAlt: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    buttonAltLabel: {
      color: theme.text.muted,
      ...theme.typography.button,
    },
    errorText: {
      color: theme.colors.error,
      ...theme.typography.caption,
    },
    infoText: {
      color: theme.text.muted,
      ...theme.typography.caption,
    },
  });
