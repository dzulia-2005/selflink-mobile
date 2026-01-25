import { getGiftPrimaryMedia, isAnimatedGift } from '@components/gifts/GiftMedia';

describe('GiftMedia helpers', () => {
  it('prefers animated image when available', () => {
    const gift = {
      id: 1,
      name: 'Sparkle',
      animation_url: 'https://cdn.example.com/sparkle.gif',
      media_url: 'https://cdn.example.com/sparkle.png',
      kind: 'animated',
    };
    const media = getGiftPrimaryMedia(gift);
    expect(media.url).toBe('https://cdn.example.com/sparkle.gif');
    expect(media.animated).toBe(true);
    expect(isAnimatedGift(gift)).toBe(true);
  });

  it('falls back to static image when animation is video', () => {
    const gift = {
      id: 2,
      name: 'Burst',
      animation_url: 'https://cdn.example.com/burst.mp4',
      media_url: 'https://cdn.example.com/burst.png',
      kind: 'animated',
    };
    const media = getGiftPrimaryMedia(gift);
    expect(media.url).toBe('https://cdn.example.com/burst.png');
  });

  it('uses static media when no animation exists', () => {
    const gift = {
      id: 3,
      name: 'Rose',
      media_url: 'https://cdn.example.com/rose.png',
      kind: 'static',
    };
    const media = getGiftPrimaryMedia(gift);
    expect(media.url).toBe('https://cdn.example.com/rose.png');
    expect(media.animated).toBe(false);
  });
});
