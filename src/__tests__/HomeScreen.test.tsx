import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from '@screens/HomeScreen';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('@hooks/useBackendHealth', () => ({
  useBackendHealth: () => ({
    status: 'online',
    error: undefined,
    refresh: jest.fn(),
  }),
}));

describe('HomeScreen', () => {
  it('renders the call to action buttons', () => {
    const initialMetrics = {
      frame: { x: 0, y: 0, width: 320, height: 640 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    };

    const { getByText } = render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <HomeScreen />
      </SafeAreaProvider>,
    );

    expect(getByText('Mentor Session')).toBeTruthy();
    expect(getByText('SoulMatch')).toBeTruthy();
    expect(getByText('Payments')).toBeTruthy();
  });
});
