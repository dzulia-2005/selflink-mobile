import { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { UserAvatar } from '@components/UserAvatar';
import { useTheme, type Theme } from '@theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  pending?: boolean;
  avatarUrl?: string | null;
  avatarLabel?: string | null;
  placeholder?: string;
};

function CommentComposerComponent({
  value,
  onChangeText,
  onSubmit,
  disabled,
  pending,
  avatarUrl,
  avatarLabel,
  placeholder = 'Add a comment…',
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const canSend = Boolean(value.trim()) && !disabled && !pending;
  return (
    <View style={styles.container}>
      <UserAvatar uri={avatarUrl ?? undefined} label={avatarLabel || 'You'} size={32} />
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.reels.textSecondary}
          style={styles.input}
          editable={!pending}
          multiline
        />
      </View>
      <TouchableOpacity
        onPress={onSubmit}
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        disabled={!canSend}
        accessibilityRole="button"
      >
        {pending ? (
          <ActivityIndicator color={theme.reels.textPrimary} />
        ) : (
          <Text style={styles.sendLabel}>Send</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export const CommentComposer = memo(CommentComposerComponent);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(148,163,184,0.3)',
      paddingTop: 10,
      paddingBottom: 6,
    },
    inputWrap: {
      flex: 1,
    },
    input: {
      minHeight: 44,
      maxHeight: 140,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.35)',
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.reels.textPrimary,
      backgroundColor: 'rgba(15,23,42,0.65)',
    },
    sendButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.feed.accentBlue,
    },
    sendButtonDisabled: {
      opacity: 0.6,
    },
    sendLabel: {
      color: '#0B1120',
      fontWeight: '800',
    },
  });
