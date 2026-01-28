import { canRenderLottie, isLottieJsonUrl } from '@utils/lottieGuard';

describe('lottieGuard', () => {
  it('detects lottie json urls', () => {
    expect(isLottieJsonUrl('https://cdn.example.com/gift.json')).toBe(true);
    expect(isLottieJsonUrl('/media/gifts/gift.lottie')).toBe(true);
    expect(isLottieJsonUrl('https://cdn.example.com/gift.gif')).toBe(false);
  });

  it('does not throw when lottie is unavailable', () => {
    expect(typeof canRenderLottie()).toBe('boolean');
  });
});
