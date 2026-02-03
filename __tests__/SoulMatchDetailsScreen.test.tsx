import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';

import { SoulmatchResult } from '@schemas/soulmatch';
import { SoulMatchDetailsScreen } from '@screens/soulmatch/SoulMatchDetailsScreen';

jest.mock('@react-navigation/native', () => {
  return {
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({ params: { userId: 2, displayName: 'Orion' } }),
  };
});
jest.mock('@services/api/soulmatch', () => ({
  fetchSoulmatchWith: jest.fn(),
  fetchSoulmatchMentor: jest.fn(),
}));
jest.mock('@context/ToastContext', () => ({
  useToast: () => ({ push: jest.fn() }),
}));

const sample: SoulmatchResult = {
  user: { id: 2, name: 'Orion', handle: 'orion', photo: '' },
  score: 72,
  components: { astro: 80, matrix: 65, psychology: 70, lifestyle: 68 },
  tags: ['magnetic', 'playful'],
};

describe('SoulMatchDetailsScreen', () => {
  beforeAll(() => {
    jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: (cb?: Animated.EndCallback) => cb?.({ finished: true }),
      stop: jest.fn(),
      reset: jest.fn(),
    })) as unknown as Animated.CompositeAnimation;
  });

  it('shows compatibility, breakdown, and highlights', async () => {
    const { getByText } = render(
      <SoulMatchDetailsScreen prefetchedData={sample} skipAutoLoad />,
    );

    await waitFor(() => expect(getByText('SoulMatch compatibility')).toBeTruthy());
    expect(getByText('72%')).toBeTruthy();
    expect(getByText('Score Breakdown')).toBeTruthy();
    expect(getByText('Cosmic sync')).toBeTruthy();
  });
});
