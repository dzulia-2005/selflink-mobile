import { useNavigation } from '@react-navigation/native';
import { memo, useCallback } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { SoulMatchFeedCard as SoulMatchFeedCardData } from '@schemas/feed';
import { UserAvatar } from './UserAvatar';

type Props = {
  data: SoulMatchFeedCardData;
};

const AVATAR_SIZE = 48;

function SoulMatchFeedCardComponent({ data }: Props) {
  const navigation = useNavigation<any>();
  const tabNavigation = navigation.getParent();

  const handlePress = useCallback(() => {
    const hasProfiles = Array.isArray(data.profiles) && data.profiles.length > 0;
    const params = hasProfiles
      ? { screen: 'SoulMatchRecommendations' }
      : { screen: 'SoulMatchHome' };
    if (tabNavigation) {
      tabNavigation.navigate('SoulMatch', params);
      return;
    }
    navigation.navigate('SoulMatch', params);
  }, [data.profiles, navigation, tabNavigation]);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>SoulMatch</Text>
      <Text style={styles.title}>{data.title}</Text>
      {data.subtitle ? <Text style={styles.subtitle}>{data.subtitle}</Text> : null}

      {data.profiles.length > 0 ? (
        <View style={styles.profileRow}>
          {data.profiles.slice(0, 3).map((profile) => {
            const label = profile.name || 'User';
            const avatarSource =
              profile.avatarUrl && profile.avatarUrl.length > 0
                ? { uri: profile.avatarUrl }
                : undefined;
            return (
              <View key={profile.id} style={styles.profile}>
                {avatarSource ? (
                  <Image source={avatarSource} style={styles.avatarImage} />
                ) : (
                  <UserAvatar uri={avatarSource?.uri} label={label} size={AVATAR_SIZE} />
                )}
                <Text style={styles.profileName} numberOfLines={1}>
                  {label}
                </Text>
                {profile.score !== undefined && profile.score !== null ? (
                  <Text style={styles.profileScore}>{Math.round(profile.score)}%</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyProfiles}>
          <Text style={styles.emptyProfilesText}>Add your birth data to unlock matches.</Text>
        </View>
      )}

      <TouchableOpacity style={styles.ctaButton} onPress={handlePress} activeOpacity={0.9}>
        <Text style={styles.ctaText}>{data.cta ?? 'View matches'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export const SoulMatchFeedCard = memo(SoulMatchFeedCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0B1120',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.35)',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  label: {
    color: '#EC4899',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    color: '#F9A8D4',
    marginTop: 6,
    lineHeight: 20,
  },
  profileRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  profile: {
    alignItems: 'center',
    width: 90,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  profileName: {
    color: '#E2E8F0',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  profileScore: {
    color: '#EC4899',
    marginTop: 2,
    fontWeight: '700',
  },
  emptyProfiles: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.35)',
    backgroundColor: 'rgba(236,72,153,0.08)',
  },
  emptyProfilesText: {
    color: '#F9A8D4',
    textAlign: 'center',
    fontWeight: '600',
  },
  ctaButton: {
    marginTop: 14,
    backgroundColor: '#EC4899',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#0B1120',
    fontWeight: '700',
  },
});
