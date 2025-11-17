import { memo, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { MediaAsset } from '@types/social';

import { MarkdownText } from './markdown/MarkdownText';
import { resolveMediaUrl } from '@utils/media';

type Props = {
  text?: string | null;
  media?: MediaAsset[] | null;
};

type Attachment = {
  key: string;
  uri: string;
  aspectRatio?: number;
};

function PostContentComponent({ text, media }: Props) {
  const attachments = useMemo(() => {
    if (!media || media.length === 0) {
      return [];
    }
    return media
      .map((item, index) => {
        const uri = resolveMediaUrl(item);
        if (!uri) {
          return null;
        }
        const ratio =
          item.width && item.height && item.width > 0 && item.height > 0
            ? item.width / item.height
            : undefined;
        return {
          key: String(item.id ?? item.s3_key ?? index),
          uri,
          aspectRatio: ratio,
        };
      })
      .filter(Boolean) as Attachment[];
  }, [media]);

  return (
    <View style={styles.container}>
      {text ? (
        <View style={styles.markdownWrapper}>
          <MarkdownText>{text}</MarkdownText>
        </View>
      ) : null}
      {attachments.length > 0 ? (
        <View style={styles.gallery}>
          {attachments.map((attachment, index) => (
            <View
              key={attachment.key}
              style={[
                styles.attachment,
                getAttachmentLayout(index, attachments.length),
                attachment.aspectRatio
                  ? { aspectRatio: attachment.aspectRatio }
                  : undefined,
              ]}
            >
              <Image source={{ uri: attachment.uri }} style={styles.mediaImage} resizeMode="cover" />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const getAttachmentLayout = (index: number, count: number) => {
  if (count === 1) {
    return styles.single;
  }
  if (count === 2) {
    return styles.pair;
  }
  if (count === 3) {
    return index === 0 ? styles.threeHero : styles.threeSupport;
  }
  if (count === 4) {
    return styles.quad;
  }
  return styles.masonry;
};

export const PostContent = memo(PostContentComponent);

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  markdownWrapper: {
    gap: 8,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  attachment: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  single: {
    width: '100%',
    minHeight: 240,
  },
  pair: {
    width: '48%',
    minHeight: 180,
  },
  threeHero: {
    width: '100%',
    minHeight: 220,
  },
  threeSupport: {
    width: '48%',
    minHeight: 140,
  },
  quad: {
    width: '48%',
    minHeight: 160,
  },
  masonry: {
    width: '31%',
    minHeight: 120,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
});
