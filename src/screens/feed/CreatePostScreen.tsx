import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

export function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PickedImage | null>(null);
  const { pickImage, isPicking } = useImagePicker({ allowsEditing: true, quality: 0.9 });

  const canSubmit = useMemo(
    () => Boolean(content.trim()) || Boolean(selectedImage),
    [content, selectedImage],
  );

  const handlePickImage = useCallback(async () => {
    if (isPicking || isSubmitting) {
      return;
    }
    const asset = await pickImage();
    if (asset) {
      setSelectedImage(asset);
    }
  }, [isPicking, pickImage, isSubmitting]);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed && !selectedImage) {
      Alert.alert(
        'Content required',
        'Write something or attach a photo before posting.',
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await createPost({
        content: trimmed,
        imageUris: selectedImage ? [selectedImage.uri] : undefined,
      });
      Alert.alert('Success', 'Post created successfully.');
      setContent('');
      setSelectedImage(null);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Unable to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [content, navigation, selectedImage]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Share something… Markdown supported."
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
            (isPicking || isSubmitting) && styles.actionButtonDisabled,
          ]}
          onPress={handlePickImage}
          disabled={isPicking || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Attach image"
          activeOpacity={0.85}
        >
          <Ionicons name="image-outline" size={18} color="#0EA5E9" />
          <Text style={styles.actionLabel}>
            {selectedImage ? 'Change photo' : 'Add photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedImage ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemoveImage}
            accessibilityRole="button"
            accessibilityLabel="Remove selected photo"
          >
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : null}

      {content.trim() ? (
        <View style={styles.markdownPreview}>
          <Text style={styles.previewTitle}>Live preview</Text>
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
        accessibilityLabel="Publish post"
        activeOpacity={0.9}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#0B1120" />
        ) : (
          <Text style={styles.submitLabel}>Post</Text>
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
  },
  previewImage: {
    width: '100%',
    height: 220,
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
