import { Image, StyleSheet, Text, View } from 'react-native';

import { normalizeAvatarUrl } from '@utils/avatar';

type Props = {
  uri?: string | null;
  size?: number;
  label?: string;
};

export function UserAvatar({ uri, size = 48, label }: Props) {
  const resolvedUri = normalizeAvatarUrl(uri);
  if (__DEV__) {
    console.debug('UserAvatar: resolved avatar uri', { raw: uri, uri: resolvedUri });
  }

  const initials = label
    ? label
        .split(' ')
        .map((chunk) => chunk.trim()[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  if (resolvedUri) {
    return (
      <Image
        source={{ uri: resolvedUri }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={styles.placeholderLabel}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 24,
  },
  placeholder: {
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLabel: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
});
