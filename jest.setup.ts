import '@testing-library/jest-native/extend-expect';

// React 19 requires explicitly opting into act() support for custom environments.
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Provide minimal bridge config so NativeModules invariant passes in tests.
(globalThis as any).__fbBatchedBridgeConfig = {
  remoteModuleConfig: [],
  localModules: [],
};

jest.mock('react-native/Libraries/NativeModules/specs/NativeSourceCode', () => ({
  getConstants: () => ({ scriptURL: 'http://localhost/' }),
}));

jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativeSourceCode', () => ({
  getConstants: () => ({ scriptURL: 'http://localhost/' }),
}));

jest.mock(
  'react-native/src/private/specs_DEPRECATED/modules/NativePlatformConstantsIOS',
  () => ({
    getConstants: () => ({
      forceTouchAvailable: false,
      interfaceIdiom: 'phone',
      osVersion: 'test',
      systemName: 'iOS',
    }),
  }),
);

jest.mock('react-native/Libraries/Utilities/NativePlatformConstantsIOS', () => ({
  getConstants: () => ({
    forceTouchAvailable: false,
    interfaceIdiom: 'phone',
    osVersion: 'test',
    systemName: 'iOS',
  }),
}));

jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativeDeviceInfo', () => ({
  getConstants: () => ({
    Dimensions: {
      window: { width: 375, height: 667, scale: 2, fontScale: 2 },
      screen: { width: 375, height: 667, scale: 2, fontScale: 2 },
    },
  }),
}));

jest.mock('react-native/Libraries/Utilities/NativeDeviceInfo', () => ({
  getConstants: () => ({
    Dimensions: {
      window: { width: 375, height: 667, scale: 2, fontScale: 2 },
      screen: { width: 375, height: 667, scale: 2, fontScale: 2 },
    },
  }),
}));

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return class NativeEventEmitter {
    addListener() {
      return { remove() {} };
    }
    removeAllListeners() {}
    removeSubscription() {}
    emit() {}
    once() {}
    listenerCount() {
      return 0;
    }
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, ...props }: { name: string }) =>
    React.createElement(Text, props, name);
  return { Ionicons: Icon };
});

jest.mock('react-native/src/private/animated/NativeAnimatedHelper', () => {
  const api = {
    addAnimatedEventToView: jest.fn(),
    removeAnimatedEventFromView: jest.fn(),
    createAnimatedNode: jest.fn(),
    startAnimatingNode: jest.fn(),
    stopAnimation: jest.fn(),
    setAnimatedNodeValue: jest.fn(),
    setAnimatedNodeOffset: jest.fn(),
    flattenAnimatedNodeOffset: jest.fn(),
    extractAnimatedNodeOffset: jest.fn(),
    connectAnimatedNodes: jest.fn(),
    disconnectAnimatedNodes: jest.fn(),
    startListeningToAnimatedNodeValue: jest.fn(),
    stopListeningToAnimatedNodeValue: jest.fn(),
    restoreDefaultValues: jest.fn(),
    getValue: jest.fn(),
    setWaitingForIdentifier: jest.fn(),
    unsetWaitingForIdentifier: jest.fn(),
    updateAnimatedNodeConfig: jest.fn(),
    dropAnimatedNode: jest.fn(),
  };
  const helper = {
    API: api,
    nativeEventEmitter: { addListener: jest.fn(() => ({ remove() {} })) },
    shouldUseNativeDriver: jest.fn(() => false),
    transformDataType: jest.fn((value) => value),
    generateNewAnimationId: jest.fn(() => 1),
    generateNewNodeTag: jest.fn(() => 1),
    assertNativeAnimatedModule: jest.fn(),
  };
  return { __esModule: true, default: helper };
});

jest.mock('react-native/Libraries/Animated/Animated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const AnimatedComponent = React.forwardRef((props: any, ref: any) =>
    React.createElement(View, { ...props, ref }, props.children),
  );
  const MockAnimated = {
    View: AnimatedComponent,
    timing: () => ({
      start: (cb?: () => void) => cb && cb(),
    }),
    parallel: () => ({
      start: (cb?: (result?: { finished: boolean }) => void) =>
        cb && cb({ finished: true }),
      stop: jest.fn(),
      reset: jest.fn(),
    }),
    spring: () => ({
      start: (cb?: (result?: { finished: boolean }) => void) =>
        cb && cb({ finished: true }),
      stop: jest.fn(),
      reset: jest.fn(),
    }),
    Value: class {
      private _value: number;
      constructor(value: number) {
        this._value = value;
      }
      setValue(next: number) {
        this._value = next;
      }
      interpolate(_: any) {
        return {
          __getValue: () => this._value,
        };
      }
      addListener = jest.fn(() => ({ remove: jest.fn() }));
      removeAllListeners = jest.fn();
      stopAnimation = jest.fn();
    },
    event: () => jest.fn(),
    createAnimatedComponent: (Component: any) =>
      React.forwardRef((props: any, ref: any) =>
        React.createElement(Component || View, { ...props, ref }, props.children),
      ),
  };
  return { __esModule: true, default: MockAnimated, ...MockAnimated };
});

jest.mock('react-native/Libraries/Image/NativeImageLoaderIOS', () => ({
  getSize: jest.fn(),
  getSizeWithHeaders: jest.fn(),
}));

jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props: any, ref: any) =>
    React.createElement(View, { ...props, ref }, props.children),
  );
});

jest.mock('react-native/Libraries/Components/Touchable/TouchableOpacity', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props: any, ref: any) =>
    React.createElement(View, { ...props, ref }, props.children),
  );
});

jest.mock('react-native/Libraries/Components/Pressable/Pressable', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props: any, ref: any) =>
    React.createElement(View, { ...props, ref }, props.children),
  );
});

{
  const ReactNative = require('react-native');
  const React = require('react');
  Object.defineProperty(ReactNative, 'TouchableOpacity', {
    configurable: true,
    enumerable: true,
    value: React.forwardRef((props: any, ref: any) =>
      React.createElement(ReactNative.View, { ...props, ref }, props.children),
    ),
  });
  Object.defineProperty(ReactNative, 'Pressable', {
    configurable: true,
    enumerable: true,
    value: React.forwardRef((props: any, ref: any) =>
      React.createElement(ReactNative.View, { ...props, ref }, props.children),
    ),
  });
  Object.defineProperty(ReactNative, 'StatusBar', {
    configurable: true,
    enumerable: true,
    value: React.forwardRef((props: any, ref: any) =>
      React.createElement(ReactNative.View, { ...props, ref }, props.children),
    ),
  });
}

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 0, height: 0 },
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    },
  };
});

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

jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mockPlayer = {
    play: jest.fn(),
    pause: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    loop: true,
    muted: true,
  };
  return {
    VideoView: React.forwardRef((props: any, ref: any) =>
      React.createElement(View, { ...props, ref }, props.children),
    ),
    useVideoPlayer: () => mockPlayer,
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, ...props }: { name: string }) =>
    React.createElement(Text, props, name);
  return { Ionicons: Icon };
});
