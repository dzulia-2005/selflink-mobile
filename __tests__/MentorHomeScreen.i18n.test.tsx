import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { MentorHomeScreen } from '@screens/mentor/MentorHomeScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: any) => ReactModule.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'mentor.home.title': 'Mentor',
          'mentor.home.natalCard.birthDataOptions': 'Birth Data Options',
          'mentor.home.chatCard.openChat': 'Open Mentor Chat',
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

describe('MentorHomeScreen i18n', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders translated mentor home labels', () => {
    const { getByText } = render(<MentorHomeScreen />);
    expect(getByText('Mentor')).toBeTruthy();
    fireEvent.press(getByText('Birth Data Options'));
    fireEvent.press(getByText('Open Mentor Chat'));
  });
});
