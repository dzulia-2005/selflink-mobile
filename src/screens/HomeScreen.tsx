import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
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
import { MetalToast } from '@components/MetalToast';
import { StatusPill } from '@components/StatusPill';
import { useAuth } from '@hooks/useAuth';
import { useBackendHealth } from '@hooks/useBackendHealth';
import { RootStackParamList } from '@navigation/AppNavigator';
import { theme } from '@theme/index';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { status, error, refresh } = useBackendHealth();
  const { user, signOut, profileError, refreshProfile } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleMentorPress = useCallback(() => {
    navigation.navigate('Mentor');
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <MetalToast
          visible={Boolean(profileError)}
          message={profileError ?? ''}
          tone="error"
          actionLabel="Retry"
          onAction={refreshProfile}
        />
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

const styles = StyleSheet.create<Styles>({
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
