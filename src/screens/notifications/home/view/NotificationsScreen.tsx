import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

export function NotificationsScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('notifications.title')}</Text>
      <Text style={styles.subtitle}>{t('notifications.empty.body')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
    padding: 24,
    gap: 8,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    textAlign: 'center',
  },
});
