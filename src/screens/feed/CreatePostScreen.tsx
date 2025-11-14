import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, Button, StyleSheet, TextInput, View } from 'react-native';

import { createPost } from '@api/social';

export function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Content required', 'Please enter some text for your post.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createPost({ content: content.trim() });
      Alert.alert('Success', 'Post created successfully.');
      setContent('');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Unable to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Share something..."
        value={content}
        onChangeText={setContent}
        multiline
      />
      <Button
        title={isSubmitting ? 'Posting…' : 'Post'}
        onPress={handleSubmit}
        disabled={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
  },
});
