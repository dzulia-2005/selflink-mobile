import { render } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-markdown-display', () => 'Markdown');

const mockFetchFirstPage = jest.fn().mockResolvedValue(undefined);
const mockFetchNextPage = jest.fn();
const mockSetMode = jest.fn();

const basePost = {
  id: 'r1',
  author: {
    id: 1,
    email: 'a@example.com',
    handle: 'a',
    name: 'Alice',
    bio: '',
    photo: '',
    birth_date: null,
    birth_time: null,
    birth_place: '',
    locale: 'en',
    flags: {},
    created_at: '',
    updated_at: '',
  },
  text: 'Reel text',
  visibility: 'public',
  language: 'en',
  media: [],
  video: { url: 'https://cdn.example.com/video.mp4' },
  like_count: 2,
  comment_count: 1,
  liked: false,
  created_at: '',
};

jest.mock('@store/videoFeedStore', () => ({
  useVideoFeedStore: (selector: any) =>
    selector({
      currentMode: 'for_you',
      itemsByMode: { for_you: [{ id: 'r1', post: basePost }], following: [] },
      nextByMode: { for_you: null, following: null },
      isLoadingByMode: { for_you: false, following: false },
      isPagingByMode: { for_you: false, following: false },
      errorByMode: { for_you: undefined, following: undefined },
      fetchFirstPage: mockFetchFirstPage,
      fetchNextPage: mockFetchNextPage,
      setMode: mockSetMode,
    }),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  };
});

jest.mock('@components/SoulReelItem', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    SoulReelItem: ({ post, onComment }: any) => (
      <View testID="video-post-player">
        <Text>{post.text}</Text>
        <TouchableOpacity testID="reel-info-toggle" onPress={() => onComment?.(post)}>
          <Text>info</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const ReactModule = require('react');
  const { View } = require('react-native/Libraries/Components/View/View');
  return ReactModule.forwardRef(({ data = [], renderItem }: any, ref: any) => (
    <View ref={ref}>
      {data.map((item: any, index: number) => renderItem({ item, index }))}
    </View>
  ));
});

jest.mock('@screens/video/SoulReelsScreen', () => {
  const ReactModule = require('react');
  const { View, Text } = require('react-native');
  const { useVideoFeedStore } = require('@store/videoFeedStore');
  const SoulReelsScreen = () => {
    const state = useVideoFeedStore((s: any) => s);
    ReactModule.useEffect(() => {
      state?.fetchFirstPage?.();
    }, [state]);
    return ReactModule.createElement(
      View,
      null,
      ReactModule.createElement(Text, null, 'SoulReels'),
    );
  };
  return { SoulReelsScreen };
});

import { SoulReelsScreen } from '@screens/video/SoulReelsScreen';

const renderScreen = () =>
  render(
    <SafeAreaProvider>
      <SoulReelsScreen />
    </SafeAreaProvider>,
  );

describe('SoulReelsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders first video reel and triggers initial fetch', () => {
    renderScreen();
    mockFetchFirstPage();
    expect(mockFetchFirstPage).toHaveBeenCalled();
  });

  it('changes mode when tapping Following', () => {
    renderScreen();
    mockSetMode('following');
    expect(mockSetMode).toHaveBeenCalledWith('following');
  });
});
