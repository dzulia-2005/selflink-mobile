import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { VideoView, type VideoPlayerStatus, useVideoPlayer } from 'expo-video';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PostVideo } from '@schemas/social';

type Props = {
  source: PostVideo;
  shouldPlay?: boolean;
  mode?: 'inline' | 'reel';
};

const formatDuration = (seconds?: number | null): string | null => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
    return null;
  }
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function VideoPostPlayerComponent({ source, shouldPlay = false, mode = 'inline' }: Props) {
  const isScreenFocused = useIsFocused();
  const isMounted = useRef(true);
  const [isMuted, setIsMuted] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<VideoPlayerStatus>('loading');

  const player = useVideoPlayer(source.url, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  const shouldBePlaying = isScreenFocused && shouldPlay && !userPaused;

  const aspectRatio = useMemo(() => {
    if (mode === 'reel') {
      return undefined;
    }
    if (source.width && source.height && source.width > 0 && source.height > 0) {
      return source.width / source.height;
    }
    return 9 / 16;
  }, [mode, source.height, source.width]);

  useEffect(() => {
    const playSub = player.addListener?.('playingChange', ({ isPlaying: playing }: any) =>
      setIsPlaying(playing),
    );
    const statusSub = player.addListener?.('statusChange', ({ status: next }: any) =>
      setStatus(next),
    );
    return () => {
      playSub?.remove?.();
      statusSub?.remove?.();
    };
  }, [player]);

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  const safePause = useCallback(() => {
    if (!isMounted.current) {
      return;
    }
    player.pause();
  }, [player]);

  const safePlay = useCallback(() => {
    if (!isMounted.current) {
      return;
    }
    player.play();
  }, [player]);

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (shouldBePlaying) {
      safePlay();
    } else {
      safePause();
    }
  }, [player, safePause, safePlay, shouldBePlaying]);

  const handleTogglePlayback = () => {
    if (isPlaying) {
      setUserPaused(true);
      safePause();
    } else {
      setUserPaused(false);
      safePlay();
    }
  };

  const handleToggleMute = () => setIsMuted((prev) => !prev);

  const durationLabel = formatDuration(source.duration ?? null);

  if (!source?.url) {
    return null;
  }

  return (
    <View
      style={[styles.container, mode === 'reel' && styles.containerReel]}
      testID="video-post-player"
    >
      <Pressable onPress={handleTogglePlayback}>
        <VideoView
          player={player}
          contentFit="cover"
          allowsPictureInPicture={false}
          nativeControls={false}
          style={[
            styles.video,
            mode === 'reel' ? styles.videoReel : null,
            aspectRatio ? { aspectRatio } : styles.fullSize,
          ]}
        />
        <View style={styles.overlay}>
          {mode === 'inline' ? (
            <View style={styles.tag}>
              <Ionicons name="play-circle" color="#0EA5E9" size={14} />
              <Text style={styles.tagText}>VIDEO</Text>
            </View>
          ) : null}
          <Pressable
            onPress={handleToggleMute}
            hitSlop={10}
            style={styles.muteButton}
            testID="video-mute-toggle"
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={18}
              color="#E2E8F0"
            />
          </Pressable>
          {!isPlaying ? (
            <View style={styles.centerIndicator} pointerEvents="none">
              <Ionicons name="play" size={32} color="#E2E8F0" />
            </View>
          ) : null}
          {status === 'loading' ? (
            <View style={styles.buffering}>
              <ActivityIndicator color="#E2E8F0" />
            </View>
          ) : null}
          {mode === 'inline' && durationLabel ? (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{durationLabel}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

export const VideoPostPlayer = memo(VideoPostPlayerComponent);

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  containerReel: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    minHeight: 260,
    backgroundColor: '#0B1120',
  },
  fullSize: {
    width: '100%',
    height: '100%',
  },
  videoReel: {
    minHeight: undefined,
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 10,
  },
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  muteButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  centerIndicator: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buffering: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
  },
  durationBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  durationText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
