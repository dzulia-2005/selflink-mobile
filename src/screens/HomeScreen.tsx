import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageStyle,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { StatusPill } from '@components/StatusPill';
import { useToast } from '@context/ToastContext';
import { useAuth } from '@hooks/useAuth';
import { useBackendHealth } from '@hooks/useBackendHealth';
import type { MainTabsParamList } from '@navigation/types';
import { useTheme, type Theme } from '@theme';

type HomeNavigation = BottomTabNavigationProp<MainTabsParamList>;

export function HomeScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<HomeNavigation>();
  const { status, error, refresh } = useBackendHealth();
  const { user, signOut, profileError, refreshProfile } = useAuth();
  const toast = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileToastId, setProfileToastId] = useState<number | null>(null);

  const handleMentorPress = useCallback(() => {
    navigation.navigate('Mentor');
  }, [navigation]);

  const handleMessagesPress = useCallback(() => {
    navigation.navigate('Inbox');
  }, [navigation]);

  const handleCommunityPress = useCallback(() => {
    navigation.navigate('Community');
  }, [navigation]);

  const handlePaymentsPress = useCallback(() => {
    navigation.navigate('Payments');
  }, [navigation]);

  const handleSoulMatchPress = useCallback(() => {
    navigation.navigate('SoulMatch');
  }, [navigation]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) {
      return;
    }
    try {
      setIsSigningOut(true);
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut, isSigningOut]);

  useEffect(() => {
    if (profileError && !profileToastId) {
      const id = toast.push({
        message: profileError,
        tone: 'error',
        actionLabel: 'Retry',
        onAction: refreshProfile,
        duration: 6000,
      });
      setProfileToastId(id);
    }

    if (!profileError && profileToastId) {
      toast.dismiss(profileToastId);
      setProfileToastId(null);
    }
  }, [profileError, refreshProfile, toast, profileToastId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headline}>Selflink</Text>
          <Text style={styles.subhead}>
            Think Different. Connect deeper. Your mentor, community, and soul matches in
            one luminous space.
          </Text>
        </View>

        <MetalPanel glow>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.panelTitle}>Welcome back</Text>
              <Text style={styles.subtitle}>
                {user?.name ?? user?.email ?? 'Selflink Explorer'}
              </Text>
            </View>
            <StatusPill status="online" label="Signed In" />
          </View>
          <MetalButton
            title="View Profile"
            onPress={() => navigation.navigate('Profile')}
          />
          <MetalButton
            title={isSigningOut ? 'Signing Out…' : 'Sign Out'}
            onPress={handleSignOut}
          />
        </MetalPanel>

        <MetalPanel glow>
          <Text style={styles.panelTitle}>Today&apos;s Journey</Text>
          <View style={styles.buttonRow}>
            <MetalButton title="Community" onPress={handleCommunityPress} />
            <MetalButton title="Messages" onPress={handleMessagesPress} />
            <MetalButton title="Mentor Session" onPress={handleMentorPress} />
            <MetalButton title="SoulMatch" onPress={handleSoulMatchPress} />
            <MetalButton title="Payments" onPress={handlePaymentsPress} />
          </View>
        </MetalPanel>

        <MetalPanel>
          <View style={styles.statusHeader}>
            <Text style={styles.panelTitle}>Platform Status</Text>
            <StatusPill status={status} />
          </View>
          {error && <Text style={styles.statusError}>{error}</Text>}
          <MetalButton title="Refresh Connection" onPress={refresh} />
        </MetalPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

type Styles = {
  safeArea: ViewStyle;
  content: ViewStyle;
  hero: ViewStyle;
  logo: ImageStyle;
  headline: TextStyle;
  subhead: TextStyle;
  panelTitle: TextStyle;
  subtitle: TextStyle;
  statusHeader: ViewStyle;
  statusError: TextStyle;
  buttonRow: ViewStyle;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create<Styles>({
    safeArea: {
      flex: 1,
      backgroundColor: theme.palette.midnight,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.xl,
    },
    hero: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    logo: {
      height: 68,
      width: 68,
    },
    headline: {
      color: theme.palette.platinum,
      ...theme.typography.title,
    },
    subhead: {
      color: theme.palette.silver,
      textAlign: 'center',
      ...theme.typography.body,
    },
    panelTitle: {
      color: theme.palette.titanium,
      ...theme.typography.subtitle,
      marginBottom: theme.spacing.md,
    },
    subtitle: {
      color: theme.palette.silver,
      ...theme.typography.body,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    statusError: {
      color: theme.palette.ember,
      ...theme.typography.body,
      marginBottom: theme.spacing.sm,
    },
    buttonRow: {
      gap: theme.spacing.sm,
    },
  });
