import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';

import { SoulmatchResult } from '@schemas/soulmatch';
import { SoulMatchRecommendationsScreen } from '@screens/soulmatch/recommendations';

jest.mock('@services/api/soulmatch', () => ({
  fetchRecommendations: jest.fn(),
}));
jest.mock('@context/ToastContext', () => ({
  useToast: () => ({ push: jest.fn() }),
}));
jest.mock('@react-navigation/native', () => {
  return {
    useNavigation: () => ({ navigate: jest.fn() }),
    useFocusEffect: (cb: (fn: () => void) => void) => cb(() => undefined),
  };
});

const sample: SoulmatchResult[] = [
  {
    user: { id: 1, name: 'Lyra', handle: 'lyra', photo: '' },
    score: 85,
    components: { astro: 90, matrix: 82, psychology: 77, lifestyle: 70 },
    tags: ['deep bond', 'creative duo'],
  },
];

describe('SoulMatchRecommendationsScreen', () => {
  beforeAll(() => {
    jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: (cb?: Animated.EndCallback) => {
        cb?.({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    })) as unknown as Animated.CompositeAnimation;
    jest.spyOn(Animated, 'spring').mockImplementation(() => ({
      start: (cb?: Animated.EndCallback) => cb?.({ finished: true }),
      stop: jest.fn(),
      reset: jest.fn(),
    })) as unknown as Animated.CompositeAnimation;
  });

  it('renders match cards with score and badges', async () => {
    const { getByText, getAllByText } = render(
      <SoulMatchRecommendationsScreen initialItems={sample} skipAutoLoad />,
    );

    await waitFor(() => expect(getByText('Lyra')).toBeTruthy());
    expect(getAllByText('85%').length).toBeGreaterThan(0);
    expect(getByText('Cosmic sync')).toBeTruthy();
  });
});
