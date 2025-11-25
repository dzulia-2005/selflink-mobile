import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NatalChart } from '@schemas/astro';
import { NatalChartScreen } from '@screens/astro/NatalChartScreen';
import { getMyNatalChart } from '@services/api/astro';

jest.mock('@services/api/astro', () => ({
  getMyNatalChart: jest.fn(),
  createOrUpdateNatalChart: jest.fn(),
}));
jest.mock('@react-navigation/native', () => {
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    NavigationContainer: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});
jest.mock('@expo/vector-icons', () => {
  const ReactMock = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});
jest.mock('@components/astro/AstroWheel', () => {
  const ReactMock = require('react');
  const { Text } = require('react-native');
  return {
    PLANET_COLORS: { sun: '#fff', moon: '#eee', mars: '#f00' },
    AstroWheel: ({ planets }: { planets?: Record<string, unknown> }) => (
      <Text>{`Wheel ${Object.keys(planets || {}).length}`}</Text>
    ),
  };
});

const mockChart: NatalChart = {
  planets: {
    sun: { lon: 15, sign: 'Aries', speed: 1.2 },
    moon: { lon: 200, sign: 'Libra', speed: -12.4 },
    mars: { lon: 85, sign: 'Gemini', speed: 0.5 },
  },
  houses: {
    '1': { cusp_lon: 180, sign: 'Libra' },
    '4': { cusp_lon: 270, sign: 'Capricorn' },
    '7': { cusp_lon: 0, sign: 'Aries' },
    '10': { cusp_lon: 90, sign: 'Cancer' },
  },
  aspects: [{ planet1: 'Sun', planet2: 'Moon', aspect: 'Trine', orb: 3.2 }],
  calculated_at: '2024-01-01T00:00:00Z',
};

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('NatalChartScreen', () => {
  beforeEach(() => {
    (getMyNatalChart as jest.Mock).mockResolvedValue(mockChart);
  });

  afterEach(() => {
    (getMyNatalChart as jest.Mock).mockReset();
  });

  it('renders core sections and natal data', async () => {
    const { getByText, getAllByText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <NatalChartScreen prefetchedChart={mockChart} skipAutoFetch />
      </SafeAreaProvider>,
    );

    await waitFor(() => expect(getByText('Core Identity')).toBeTruthy());
    expect(getByText('Planets')).toBeTruthy();
    expect(getByText('Houses')).toBeTruthy();
    expect(getByText('Aspects')).toBeTruthy();
    expect(getByText('Element Balance')).toBeTruthy();

    expect(getByText('Sun Trine Moon')).toBeTruthy();
    expect(getAllByText(/Aries/).length).toBeGreaterThan(0);
  });
});
