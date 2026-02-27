import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: Props) {
  const { t } = useTranslation();
  const resolvedMessage = message ?? t('common.error.defaultMessage');
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{resolvedMessage}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryLabel}>{t('common.error.tryAgain')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#EF4444',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  retryLabel: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
});
