import { normalizeGiftRenderData } from '@utils/gifts';

describe('normalizeGiftRenderData', () => {
  it('returns empty data for unknown input', () => {
    const data = normalizeGiftRenderData(null);

    expect(data.totalCount).toBe(0);
    expect(data.recent).toEqual([]);
  });

  it('normalizes summary counts', () => {
    const data = normalizeGiftRenderData({
      gift_summary: { sparkle: 2, '12': 3 },
    });

    expect(data.counts.sparkle).toBe(2);
    expect(data.counts['12']).toBe(3);
    expect(data.totalCount).toBe(5);
  });

  it('normalizes recent gifts list', () => {
    const data = normalizeGiftRenderData({
      recent_gifts: [
        {
          gift_type_id: 1,
          name: 'Star',
          media_url: 'https://img.example/star.png',
          count: 2,
        },
      ],
    });

    expect(data.recent.length).toBe(1);
    expect(data.recent[0]?.name).toBe('Star');
    expect(data.totalCount).toBe(2);
  });
});
