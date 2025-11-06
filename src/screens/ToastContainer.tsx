import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { MetalToast } from '@components/MetalToast';
import { useToast } from '@context/ToastContext';

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  const items = useMemo(
    () =>
      toasts.map((toast) => (
        <MetalToast
          key={toast.id}
          visible
          message={toast.message}
          tone={toast.tone}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onDismiss={() => dismiss(toast.id)}
        />
      )),
    [toasts, dismiss],
  );

  if (items.length === 0) {
    return null;
  }

  return <View style={styles.container}>{items}</View>;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 12,
    zIndex: 1000,
  },
});
