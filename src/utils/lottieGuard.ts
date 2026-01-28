let cachedSupport: boolean | null = null;

export const isLottieJsonUrl = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  return /\.(json|lottie)(\?|$)/i.test(value.trim());
};

export const canRenderLottie = (): boolean => {
  if (cachedSupport !== null) {
    return cachedSupport;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('lottie-react-native');
    const LottieView = mod?.default ?? mod?.LottieView ?? mod;
    cachedSupport = Boolean(LottieView);
    return cachedSupport;
  } catch {
    cachedSupport = false;
    return false;
  }
};
