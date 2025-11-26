import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import { CreatePostScreen } from '@screens/feed/CreatePostScreen';

jest.mock('react-native-markdown-display', () => 'Markdown');

const mockCreatePost = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockPickImage = jest.fn(async () => ({
  uri: 'photo-1.jpg',
  name: 'photo-1.jpg',
  type: 'image/jpeg',
}));
const mockPickVideo = jest.fn(async () => ({
  uri: 'video-1.mp4',
  name: 'video-1.mp4',
  type: 'video/mp4',
  duration: 5,
}));

jest.mock('@api/social', () => ({
  createPost: (...args: unknown[]) => mockCreatePost(...args),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('@hooks/useImagePicker', () => ({
  useImagePicker: () => ({
    pickImage: mockPickImage,
    isPicking: false,
  }),
}));

jest.mock('@hooks/useVideoPicker', () => ({
  useVideoPicker: () => ({
    pickVideo: mockPickVideo,
    isPicking: false,
  }),
}));

describe('CreatePostScreen', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockImplementation((title, message, buttons) => {
      if (Array.isArray(buttons)) {
        buttons.forEach((button) => {
          if (button.text === 'Use video' && button.onPress) {
            button.onPress();
          }
        });
      }
      return undefined as any;
    });
    mockCreatePost.mockResolvedValue(undefined);
  });

  it('shows video add action', () => {
    const { getByText } = render(<CreatePostScreen />);
    expect(getByText('Add video')).toBeTruthy();
  });

  it('replaces selected photos with a picked video and submits video only', async () => {
    const { getByText, queryByLabelText } = render(<CreatePostScreen />);

    fireEvent.press(getByText('Add photos'));
    await waitFor(() => expect(mockPickImage).toHaveBeenCalled());

    fireEvent.press(getByText('Add video'));

    await waitFor(() => expect(getByText('Video selected')).toBeTruthy());
    expect(queryByLabelText('Remove selected photo')).toBeNull();

    fireEvent.press(getByText('Post'));

    await waitFor(() => expect(mockCreatePost).toHaveBeenCalledTimes(1));
    expect(mockCreatePost).toHaveBeenCalledWith(
      expect.objectContaining({
        videoUri: 'video-1.mp4',
        imageUris: undefined,
      }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('surfaces backend video errors', async () => {
    const videoError: any = new Error('bad video');
    videoError.response = { data: { video: ['Video type not supported'] } };
    videoError.isAxiosError = true;
    mockCreatePost.mockRejectedValueOnce(videoError);

    const { getByText } = render(<CreatePostScreen />);
    fireEvent.press(getByText('Add video'));
    await waitFor(() => expect(getByText('Video selected')).toBeTruthy());

    fireEvent.press(getByText('Post'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const lastCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    expect(lastCall[0]).toBe('Unable to create post');
    expect(String(lastCall[1])).toContain('Video type not supported');
  });
});
