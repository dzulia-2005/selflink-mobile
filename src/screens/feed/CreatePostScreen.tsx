import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { isAxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { createPost } from '@api/social';
import { MarkdownText } from '@components/markdown/MarkdownText';
import { useImagePicker, type PickedImage } from '@hooks/useImagePicker';
import { useVideoPicker, type PickedVideo } from '@hooks/useVideoPicker';
import { useFeedStore } from '@store/feedStore';

export function CreatePostScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<PickedImage[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<PickedVideo | null>(null);
  const { pickImage, isPicking } = useImagePicker({ allowsEditing: true, quality: 0.9 });
  const { pickVideo, isPicking: isPickingVideo } = useVideoPicker({
    allowsEditing: false,
    quality: 0.8,
  });
  const markAllDirty = useFeedStore((state) => state.markAllDirty);

  const hasImages = selectedImages.length > 0;
  const canSubmit = useMemo(
    () => Boolean(content.trim()) || hasImages || Boolean(selectedVideo),
    [content, hasImages, selectedVideo],
  );

  const handlePickImage = useCallback(async () => {
    if (isPicking || isSubmitting || selectedVideo) {
      if (selectedVideo) {
        Alert.alert(
          t('feed.create.alerts.chooseMediaType.title'),
          t('feed.create.alerts.removeVideoFirst.body'),
        );
      }
      return;
    }
    const asset = await pickImage();
    if (asset) {
      setSelectedImages((prev) => {
        if (prev.length >= 4) {
          Alert.alert(t('feed.create.alerts.limitReached.title'), t('feed.create.alerts.limitReached.body'));
          return prev;
        }
        return [...prev, asset];
      });
    }
  }, [isPicking, pickImage, isSubmitting, selectedVideo, t]);

  const handlePickVideo = useCallback(async () => {
    if (isPickingVideo || isSubmitting) {
      return;
    }
    if (selectedImages.length) {
      Alert.alert(
        t('feed.create.alerts.replacePhotos.title'),
        t('feed.create.alerts.replacePhotos.body'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('feed.create.useVideo'),
            onPress: async () => {
              setSelectedImages([]);
              const asset = await pickVideo();
              if (asset) {
                setSelectedVideo(asset);
              }
            },
          },
        ],
      );
      return;
    }
    const asset = await pickVideo();
    if (asset) {
      setSelectedVideo(asset);
    }
  }, [isPickingVideo, isSubmitting, pickVideo, selectedImages.length, t]);

  const handleRemoveVideo = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  const selectedDurationLabel = useMemo(() => {
    if (!selectedVideo?.duration || Number.isNaN(selectedVideo.duration)) {
      return null;
    }
    const total = Math.max(0, Math.floor(selectedVideo.duration));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }, [selectedVideo?.duration]);

  const deriveErrorMessage = useCallback((error: unknown): string => {
    if (isAxiosError(error)) {
      const data = error.response?.data as any;
      const detail =
        data?.detail ??
        data?.error ??
        data?.message ??
        (Array.isArray(data?.video) ? data.video[0] : null) ??
        (Array.isArray(data?.images) ? data.images[0] : null);
      if (typeof detail === 'string' && detail.length > 0) {
        return detail;
      }
    }
    return t('feed.create.alerts.createFailed.body');
  }, [t]);

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    const hasImageSelection = selectedImages.length > 0;
    const hasVideo = Boolean(selectedVideo);
    if (hasImageSelection && hasVideo) {
      Alert.alert(
        t('feed.create.alerts.chooseMediaType.title'),
        t('feed.create.alerts.chooseMediaType.body'),
      );
      return;
    }
    if (!trimmed && !hasImageSelection && !hasVideo) {
      Alert.alert(
        t('feed.create.alerts.contentRequired.title'),
        t('feed.create.alerts.contentRequired.body'),
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await createPost({
        content: trimmed,
        imageUris: hasVideo ? undefined : selectedImages.map((img) => img.uri),
        videoUri: selectedVideo?.uri,
        videoName: selectedVideo?.name,
        videoMimeType: selectedVideo?.type,
      });
      Alert.alert(t('feed.create.alerts.success.title'), t('feed.create.alerts.success.body'));
      setContent('');
      setSelectedImages([]);
      setSelectedVideo(null);
      markAllDirty();
      navigation.goBack();
    } catch (error) {
      const message = deriveErrorMessage(error);
      Alert.alert(t('feed.create.alerts.createFailed.title'), message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    content,
    deriveErrorMessage,
    navigation,
    markAllDirty,
    selectedImages,
    selectedVideo,
    t,
  ]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={t('feed.create.placeholder')}
        placeholderTextColor="#94A3B8"
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
        editable={!isSubmitting}
      />

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            (isPicking || isSubmitting || Boolean(selectedVideo)) &&
              styles.actionButtonDisabled,
          ]}
          onPress={handlePickImage}
          disabled={isPicking || isSubmitting || Boolean(selectedVideo)}
          accessibilityRole="button"
          accessibilityLabel={t('feed.create.accessibility.attachImage')}
          activeOpacity={0.85}
        >
          <Ionicons name="image-outline" size={18} color="#0EA5E9" />
          <Text style={styles.actionLabel}>
            {selectedImages.length
              ? t('feed.create.addMorePhotos')
              : t('feed.create.addPhotos')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            (isPickingVideo || isSubmitting || Boolean(selectedImages.length)) &&
              styles.actionButtonDisabled,
          ]}
          onPress={handlePickVideo}
          disabled={isPickingVideo || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={t('feed.create.accessibility.attachVideo')}
          activeOpacity={0.85}
        >
          <Ionicons name="videocam-outline" size={18} color="#22C55E" />
          <Text style={[styles.actionLabel, styles.videoActionLabel]}>
            {selectedVideo ? t('feed.create.changeVideo') : t('feed.create.addVideo')}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedVideo ? (
        <View style={styles.videoPreviewContainer}>
          <View style={styles.videoPreview}>
              <Ionicons name="videocam" size={28} color="#22C55E" />
              <View style={styles.flexGrow}>
              <Text style={styles.videoTitle}>{t('feed.create.videoSelected')}</Text>
              <Text style={styles.videoMeta}>
                {selectedDurationLabel ?? t('feed.create.videoReadyToUpload')}
              </Text>
              </View>
              <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>{t('feed.create.videoBadge')}</Text>
              </View>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemoveVideo}
            accessibilityRole="button"
            accessibilityLabel={t('feed.create.accessibility.removeVideo')}
          >
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : null}

      {selectedImages.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewScroll}
        >
          {selectedImages.map((image) => (
            <View key={image.uri} style={styles.previewContainer}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <Pressable
                style={styles.removeButton}
                onPress={() =>
                  setSelectedImages((prev) =>
                    prev.filter((item) => item.uri !== image.uri),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={t('feed.create.accessibility.removePhoto')}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {content.trim() ? (
        <View style={styles.markdownPreview}>
          <Text style={styles.previewTitle}>{t('feed.create.livePreview')}</Text>
          <MarkdownText>{content}</MarkdownText>
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.submitButton,
          (!canSubmit || isSubmitting) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        accessibilityRole="button"
        accessibilityLabel={t('feed.create.publish')}
        activeOpacity={0.9}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#0B1120" />
        ) : (
          <Text style={styles.submitLabel}>{t('feed.create.publish')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
  videoActionLabel: {
    color: '#22C55E',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 8,
    padding: 12,
    minHeight: 160,
    color: '#F8FAFC',
    backgroundColor: '#0F172A',
  },
  previewContainer: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markdownPreview: {
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#0B1120',
    gap: 8,
  },
  previewTitle: {
    color: '#CBD5F5',
    fontWeight: '600',
    fontSize: 16,
  },
  previewScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  videoPreviewContainer: {
    position: 'relative',
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  videoTitle: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
  videoMeta: {
    color: '#94A3B8',
    fontSize: 12,
  },
  videoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  videoBadgeText: {
    color: '#22C55E',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  flexGrow: {
    flex: 1,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#38BDF8',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitLabel: {
    color: '#0B1120',
    fontWeight: '700',
    fontSize: 16,
  },
});
