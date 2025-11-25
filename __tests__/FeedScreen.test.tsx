import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

jest.mock('react-native-markdown-display', () => 'Markdown');

import { FeedScreen } from '@screens/feed/FeedScreen';
import type { FeedItem } from '@schemas/feed';

let mockState: any;
const mockLoadFeed = jest.fn().mockResolvedValue(undefined);
const mockLoadMore = jest.fn();
const mockAddComment = jest.fn();
const mockLikePost = jest.fn();
const mockUnlikePost = jest.fn();
const mockSetMode = jest.fn((mode) => {
  mockState.currentMode = mode;
});

const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      getParent: jest.fn(() => ({ navigate: mockParentNavigate })),
    }),
  };
});

jest.mock('@store/feedStore', () => ({
  useFeedStore: (selector: any) =>
    selector(
      mockState || {
        currentMode: 'for_you',
        itemsByMode: { for_you: [], following: [] },
        nextByMode: { for_you: null, following: null },
        isLoadingByMode: { for_you: false, following: false },
        isPagingByMode: { for_you: false, following: false },
        errorByMode: { for_you: undefined, following: undefined },
        loadFeed: mockLoadFeed,
        loadMore: mockLoadMore,
        setMode: mockSetMode,
        addComment: mockAddComment,
        likePost: mockLikePost,
        unlikePost: mockUnlikePost,
      },
    ),
}));

const baseAuthor = {
  id: 1,
  email: 'alice@example.com',
  handle: 'alice',
  name: 'Alice',
  bio: '',
  photo: '',
  birth_date: null,
  birth_time: null,
  birth_place: '',
  locale: 'en',
  flags: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const postItem: FeedItem = {
  type: 'post' as const,
  id: 'post-1',
  post: {
    id: 'post-1',
    author: baseAuthor,
    text: 'Hello world',
    visibility: 'public',
    language: 'en',
    media: [],
    like_count: 0,
    comment_count: 0,
    liked: false,
    created_at: '2024-01-01T00:00:00Z',
  },
};

const mentorItem: FeedItem = {
  type: 'mentor_insight' as const,
  id: 'mentor-1',
  mentor: {
    title: "Today's insight",
    subtitle: 'Short text from mentor or a placeholder',
    cta: 'Open mentor',
  },
};

const matrixItem: FeedItem = {
  type: 'matrix_insight' as const,
  id: 'matrix-1',
  matrix: {
    title: 'Matrix line of the day',
    subtitle: 'Short text or placeholder',
    cta: 'View matrix',
  },
};

const soulMatchItem: FeedItem = {
  type: 'soulmatch_reco',
  id: 'soulmatch-1',
  soulmatch: {
    title: 'New SoulMatch connections',
    subtitle: 'You have high compatibility today',
    cta: 'View matches',
    profiles: [
      { id: 99, name: 'Alex', avatarUrl: null, score: 92 },
      { id: 42, name: 'Gio', avatarUrl: null, score: 88 },
    ],
  },
};

describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {
      currentMode: 'for_you' as const,
      itemsByMode: { for_you: [], following: [] } as Record<
        'for_you' | 'following',
        FeedItem[]
      >,
      nextByMode: { for_you: null, following: null },
      isLoadingByMode: { for_you: false, following: false },
      isPagingByMode: { for_you: false, following: false },
      errorByMode: { for_you: undefined, following: undefined },
      loadFeed: mockLoadFeed,
      loadMore: mockLoadMore,
      setMode: mockSetMode,
      addComment: mockAddComment,
      likePost: mockLikePost,
      unlikePost: mockUnlikePost,
    };
  });

  it('renders mixed feed items', () => {
    mockState.itemsByMode.for_you = [postItem, mentorItem, matrixItem, soulMatchItem];
    const { getByText } = render(<FeedScreen />);

    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Mentor Insight')).toBeTruthy();
    expect(getByText("Today's insight")).toBeTruthy();
    expect(getByText('Matrix Insight')).toBeTruthy();
    expect(getByText('Matrix line of the day')).toBeTruthy();
    expect(getByText('SoulMatch')).toBeTruthy();
    expect(getByText('New SoulMatch connections')).toBeTruthy();
  });

  it('navigates via mentor and matrix CTAs', () => {
    mockState.itemsByMode.for_you = [mentorItem, matrixItem, soulMatchItem];
    const { getByText } = render(<FeedScreen />);

    fireEvent.press(getByText('Open mentor'));
    expect(mockParentNavigate).toHaveBeenCalledWith('Mentor', { screen: 'MentorHome' });

    fireEvent.press(getByText('View matrix'));
    expect(mockParentNavigate).toHaveBeenCalledWith('SoulMatch', {
      screen: 'SoulMatchHome',
    });

    fireEvent.press(getByText('View matches'));
    expect(mockParentNavigate).toHaveBeenCalledWith('SoulMatch', {
      screen: 'SoulMatchRecommendations',
    });
  });

  it('switches feed mode via toggle', () => {
    mockState.itemsByMode.for_you = [postItem];
    mockState.currentMode = 'for_you';
    const { getByText } = render(<FeedScreen />);

    fireEvent.press(getByText('Following'));
    expect(mockSetMode).toHaveBeenCalledWith('following');
  });
});
