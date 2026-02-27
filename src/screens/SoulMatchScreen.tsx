import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { SoulMatchStackParamList } from '@navigation/types';
import { useTheme, type Theme } from '@theme';

export function SoulMatchScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<NativeStackNavigationProp<SoulMatchStackParamList>>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.headline}>{t('soulmatch.home.title')}</Text>
        <Text style={styles.subtitle}>{t('soulmatch.home.subtitle')}</Text>

        <MetalPanel glow>
          <Text style={styles.panelTitle}>{t('soulmatch.home.recommendationsTitle')}</Text>
          <Text style={styles.cardText}>{t('soulmatch.home.recommendationsBody')}</Text>
          <MetalButton
            title={t('soulmatch.home.viewRecommendations')}
            onPress={() => navigation.navigate('SoulMatchRecommendations')}
          />
        </MetalPanel>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.palette.midnight,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    headline: {
      color: theme.palette.platinum,
      ...theme.typography.title,
    },
    subtitle: {
      color: theme.palette.silver,
      ...theme.typography.body,
    },
    panelTitle: {
      color: theme.palette.titanium,
      ...theme.typography.subtitle,
      marginBottom: theme.spacing.sm,
    },
    cardText: {
      color: theme.palette.silver,
      ...theme.typography.body,
      marginBottom: theme.spacing.sm,
    },
  });
