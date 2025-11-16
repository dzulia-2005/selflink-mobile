import { memo, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { MetalPanel } from '@components/MetalPanel';
import type { UserProfile } from '@services/api/user';
import { theme } from '@theme/index';
import { normalizeAvatarUrl } from '@utils/avatar';

type Props = {
  user: UserProfile & { flags?: Record<string, unknown> & { following?: boolean } };
  onToggleFollow: (id: number | string) => void;
  pending?: boolean;
};

export const UserCard = memo(function UserCard({
  user,
  onToggleFollow,
  pending = false,
}: Props) {
  const following = Boolean(
    (user.flags as Record<string, unknown> & { following?: boolean })?.following,
  );
  const initials = useMemo(() => {
    if (user.name) {
      return user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    return (user.handle ?? user.email ?? '?').slice(0, 2).toUpperCase();
  }, [user.name, user.handle, user.email]);

  return (
    <MetalPanel glow={following}>
      <View style={styles.row}>
        {user.photo ? (
          <Image source={{ uri: normalizeAvatarUrl(user.photo) }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text style={styles.name}>{user.name ?? 'Anonymous'}</Text>
          <Text style={styles.handle}>@{user.handle ?? 'handle'}</Text>
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => onToggleFollow(user.id)}
          style={[
            styles.followButton,
            following ? styles.following : styles.follow,
            pending && styles.disabled,
          ]}
          disabled={pending}
        >
          <Text style={styles.followText}>
            {pending ? '…' : following ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      </View>
    </MetalPanel>
  );
});

const AVATAR_SIZE = 52;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: theme.palette.graphite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
  handle: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  bio: {
    color: theme.palette.titanium,
    ...theme.typography.caption,
    lineHeight: 16,
  },
  followButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  follow: {
    borderColor: theme.palette.platinum,
  },
  following: {
    borderColor: theme.palette.azure,
  },
  followText: {
    color: theme.palette.platinum,
    ...theme.typography.caption,
  },
  disabled: {
    opacity: 0.6,
  },
});
