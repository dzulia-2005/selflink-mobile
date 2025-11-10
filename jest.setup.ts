import '@testing-library/jest-native/extend-expect';

// React 19 requires explicitly opting into act() support for custom environments.
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockFetch = async () => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({}),
  text: async () => '',
  headers: { get: () => null },
});

beforeAll(() => {
  global.fetch = jest.fn(mockFetch) as unknown as typeof fetch;
});

beforeEach(() => {
  (global.fetch as jest.Mock).mockImplementation(mockFetch);
  (global.fetch as jest.Mock).mockClear();
});

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      backendUrl: 'http://localhost:8000',
      healthEndpoint: '/api/health/',
    },
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Medium: 'Medium' },
  impactAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: any) => {
      const { children, ...rest } = props;
      return React.createElement(View, rest, children);
    },
  };
});
