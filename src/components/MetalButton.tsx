import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@theme/index';

type Props = {
  title: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
};

export function MetalButton({ title, icon, onPress, disabled = false }: Props) {
  const [pressed, setPressed] = useState(false);

  const gradientColors = useMemo(
    () =>
      disabled
        ? theme.gradients.buttonDisabled
        : pressed
          ? theme.gradients.buttonActive
          : theme.gradients.button,
    [disabled, pressed],
  );

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    setPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, [disabled]);

  const handlePressOut = useCallback(() => {
    setPressed(false);
  }, []);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed: isPressed }) => [
        styles.wrapper,
        disabled && styles.disabled,
        isPressed && { transform: [{ translateY: 1 }] },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={styles.title}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: theme.radius.pill,
    marginVertical: theme.spacing.sm,
    ...theme.shadow.button,
  },
  disabled: {
    opacity: 0.5,
  },
  button: {
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.palette.titanium,
    ...theme.typography.button,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
});
