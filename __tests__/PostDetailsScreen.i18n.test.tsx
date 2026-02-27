import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PostDetailsScreen } from '@screens/feed/PostDetailsScreen';

jest.mock('react-native-markdown-display', () => 'Markdown');

const mockGetPostComments = jest.fn().mockResolvedValue([]);
const mockAddComment = jest.fn();

jest.mock('@api/social', () => ({
  getPostComments: (...args: unknown[]) => mockGetPostComments(...args),
}));

jest.mock('@store/feedStore', () => ({
  useFeedStore: (selector: any) =>
    selector({
      addComment: mockAddComment,
    }),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({
      params: {
        postId: '1',
        post: {
          id: '1',
          author: { name: 'Author', handle: 'author', photo: '' },
          created_at: '2026-01-01T00:00:00.000Z',
          text: 'Hello',
        },
      },
    }),
  };
});

jest.mock('@context/ToastContext', () => ({
  useToast: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@hooks/useMultiImagePicker', () => ({
  useMultiImagePicker: () => ({
    images: [],
    pickImages: jest.fn(),
    removeImage: jest.fn(),
    clearImages: jest.fn(),
    isPicking: false,
    canAddMore: true,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'post.comments.loading': 'Loading comments...',
          'post.comments.empty.title': 'No comments yet.',
          'post.comments.composer.placeholder': 'Write a comment (Markdown supported)',
          'post.comments.composer.send': 'Send',
          'post.accessibility.attachImages': 'Attach images',
          'post.accessibility.sendComment': 'Send comment',
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

describe('PostDetailsScreen i18n', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders localized comment UI strings', async () => {
    const { getByPlaceholderText, getByText } = render(
      <SafeAreaProvider>
        <PostDetailsScreen />
      </SafeAreaProvider>,
    );

    await waitFor(() => expect(mockGetPostComments).toHaveBeenCalled());

    expect(getByPlaceholderText('Write a comment (Markdown supported)')).toBeTruthy();
    expect(getByText('Send')).toBeTruthy();
    expect(getByText('No comments yet.')).toBeTruthy();
  });
});
