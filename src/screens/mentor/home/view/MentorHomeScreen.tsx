import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { MentorStackParamList } from '@navigation/types';
import { useTheme, type Theme } from '@theme';

export function MentorHomeScreen() {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MentorStackParamList, 'MentorHome'>>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: theme.spacing.xl + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('mentor.home.title')}</Text>
        <Text style={styles.subtitle}>{t('mentor.home.subtitle')}</Text>

        <MetalPanel glow>
          <Text style={styles.cardTitle}>{t('mentor.home.natalCard.title')}</Text>
          <Text style={styles.cardText}>{t('mentor.home.natalCard.body')}</Text>
          <MetalButton
            title={t('mentor.home.natalCard.birthDataOptions')}
            onPress={() => navigation.navigate('BirthData')}
          />
          <MetalButton
            title={t('mentor.home.natalCard.viewNatalChart')}
            onPress={() => navigation.navigate('NatalChart')}
          />
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.cardTitle}>{t('mentor.home.chatCard.title')}</Text>
          <Text style={styles.cardText}>{t('mentor.home.chatCard.body')}</Text>
          <MetalButton
            title={t('mentor.home.chatCard.openChat')}
            onPress={() => navigation.navigate('MentorChat')}
          />
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.cardTitle}>{t('mentor.home.readingsCard.title')}</Text>
          <MetalButton
            title={t('mentor.home.readingsCard.natalMentor')}
            onPress={() => navigation.navigate('NatalMentor')}
          />
          <MetalButton
            title={t('mentor.home.readingsCard.dailyMentor')}
            onPress={() => navigation.navigate('DailyMentor')}
          />
        </MetalPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.palette.midnight,
    },
    container: {
      backgroundColor: theme.palette.midnight,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    title: {
      color: theme.palette.platinum,
      ...theme.typography.headingL,
    },
    subtitle: {
      color: theme.palette.silver,
      ...theme.typography.body,
    },
    cardTitle: {
      color: theme.palette.titanium,
      ...theme.typography.subtitle,
      marginBottom: theme.spacing.xs,
    },
    cardText: {
      color: theme.palette.silver,
      ...theme.typography.body,
      marginBottom: theme.spacing.sm,
    },
  });
