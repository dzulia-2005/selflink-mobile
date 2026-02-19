import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

export function SocialLoginScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const socialLogin = useAuthStore((state) => state.socialLogin);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);
  const [error, setError] = useState<string | null>(null);
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
      setError(googleResponse.error?.message ?? 'Google sign-in failed. Please try again.');
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
        setError('Google login returned no credential.');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to complete Google login.');
      }
    };
    run().catch(() => undefined);
  }, [googleResponse, socialLogin]);

  useEffect(() => {
    if (!githubResponse) {
      return;
    }
    if (githubResponse.type === 'error') {
      setError(githubResponse.error?.message ?? 'GitHub sign-in failed. Please try again.');
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
          setError('GitHub login returned no code.');
          return;
        }
        await socialLogin('github', { code });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to complete GitHub login.');
      }
    };
    run().catch(() => undefined);
  }, [githubResponse, socialLogin]);

  useEffect(() => {
    if (!facebookResponse) {
      return;
    }
    if (facebookResponse.type === 'error') {
      setError(facebookResponse.error?.message ?? 'Facebook sign-in failed. Please try again.');
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
          setError('Facebook login returned no code.');
          return;
        }
        await socialLogin('facebook', { code });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to complete Facebook login.');
      }
    };
    run().catch(() => undefined);
  }, [facebookResponse, socialLogin]);

  const handleGoogleLogin = async () => {
    setError(null);
    if (!proxyRedirectUri) {
      setError('Expo project owner/slug missing. Set expo.owner + expo.slug in app config.');
      return;
    }
    if (!isGoogleConfigured) {
      setError('Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env and restart Expo with `npx expo start -c`.');
      return;
    }
    if (!googleRequest) {
      setError('Google login is not ready yet.');
      return;
    }
    await googlePromptAsync();
  };

  const handleGitHubLogin = async () => {
    setError(null);
    if (!proxyRedirectUri) {
      setError('Expo project owner/slug missing. Set expo.owner + expo.slug in app config.');
      return;
    }
    if (!isGitHubConfigured) {
      setError('Set EXPO_PUBLIC_GITHUB_CLIENT_ID in .env and restart Expo with `npx expo start -c`.');
      return;
    }
    if (!githubRequest) {
      setError('GitHub login is not ready yet.');
      return;
    }
    await githubPromptAsync();
  };

  const handleFacebookLogin = async () => {
    setError(null);
    if (!proxyRedirectUri) {
      setError('Expo project owner/slug missing. Set expo.owner + expo.slug in app config.');
      return;
    }
    if (!isFacebookConfigured) {
      setError('Set EXPO_PUBLIC_FACEBOOK_APP_ID in .env and restart Expo with `npx expo start -c`.');
      return;
    }
    if (!facebookRequest) {
      setError('Facebook login is not ready yet.');
      return;
    }
    await facebookPromptAsync();
  };

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Social login</Text>
          <Text style={styles.subtitle}>Continue with Google, Facebook, or GitHub.</Text>
          {!proxyRedirectUri ? (
            <Text style={styles.errorText}>
              Expo project owner/slug missing. Set expo.owner + expo.slug in app config.
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, (isAuthenticating || !googleRequest) && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isAuthenticating || !googleRequest || !proxyRedirectUri}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonLabel}>
              {isAuthenticating
                ? 'Signing in…'
                : !googleRequest
                  ? 'Preparing Google login…'
                  : 'Continue with Google'}
            </Text>
          </TouchableOpacity>
          {!isGoogleConfigured ? (
            <Text style={styles.infoText}>
              Google login is not configured yet. Add `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to your `.env`.
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
                ? 'Signing in…'
                : !facebookRequest
                  ? 'Preparing Facebook login…'
                  : 'Continue with Facebook'}
            </Text>
          </TouchableOpacity>
          {!isFacebookConfigured ? (
            <Text style={styles.infoText}>
              Facebook login is not configured yet. Add `EXPO_PUBLIC_FACEBOOK_APP_ID` to your `.env`.
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
                ? 'Signing in…'
                : !githubRequest
                  ? 'Preparing GitHub login…'
                  : 'Continue with GitHub'}
            </Text>
          </TouchableOpacity>
          {!isGitHubConfigured ? (
            <Text style={styles.infoText}>
              GitHub login is not configured yet. Add `EXPO_PUBLIC_GITHUB_CLIENT_ID` to your `.env`.
            </Text>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.infoText}>
            Add `https://auth.expo.io/{projectFullName ?? '@owner/slug'}` to GitHub and Facebook OAuth redirect URIs.
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
