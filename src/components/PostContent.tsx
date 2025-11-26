import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AttachmentGallery } from '@components/media/AttachmentGallery';
import { VideoPostPlayer } from '@components/VideoPostPlayer';
import type { MediaAsset, PostVideo } from '@schemas/social';
import { buildAttachments } from '@utils/attachments';

import { MarkdownText } from './markdown/MarkdownText';

type Props = {
  text?: string | null;
  media?: MediaAsset[] | null;
  legacySources?: unknown[];
  video?: PostVideo | null;
  shouldPlayVideo?: boolean;
};

function PostContentComponent({
  text,
  media,
  legacySources = [],
  video,
  shouldPlayVideo,
}: Props) {
  const hasVideo = Boolean(video?.url);
  const attachments = useMemo(
    () =>
      hasVideo
        ? [] // Prefer a single video over image attachments in this phase.
        : buildAttachments({ media, legacySources }),
    [legacySources, media, hasVideo],
  );

  return (
    <View style={styles.container}>
      {text ? (
        <View style={styles.markdownWrapper}>
          <MarkdownText>{text}</MarkdownText>
        </View>
      ) : null}
      {hasVideo ? (
        <VideoPostPlayer
          source={video as PostVideo}
          shouldPlay={Boolean(shouldPlayVideo)}
        />
      ) : (
        <AttachmentGallery attachments={attachments} />
      )}
    </View>
  );
}

export const PostContent = memo(PostContentComponent);

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  markdownWrapper: {
    gap: 8,
  },
});
