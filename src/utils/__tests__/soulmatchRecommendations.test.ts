import { normalizeSoulmatchRecommendations, normalizeSoulmatchRecsResponse } from '@utils/soulmatchRecommendations';

describe('normalizeSoulmatchRecommendations', () => {
  it('filters entries without user or score', () => {
    const { items, dropped } = normalizeSoulmatchRecommendations([
      { user: null as any, score: 90 },
      { user: { id: 2, name: 'Test', handle: 'test', photo: '' }, score: NaN },
      { user: { id: 3, name: 'Valid', handle: 'valid', photo: '' }, score: 82 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].user.id).toBe(3);
    expect(dropped.missing_user).toBe(1);
    expect(dropped.missing_score).toBe(1);
  });

  it('drops entries missing user id', () => {
    const { items, dropped } = normalizeSoulmatchRecommendations([
      { user: { name: 'MissingId', handle: 'missing', photo: '' } as any, score: 70 },
    ]);
    expect(items).toHaveLength(0);
    expect(dropped.missing_user_id).toBe(1);
  });

  it('dedupes by user id', () => {
    const { items, dropped } = normalizeSoulmatchRecommendations([
      { user: { id: 1, name: 'A', handle: 'a', photo: '' }, score: 70 },
      { user: { id: 1, name: 'A', handle: 'a', photo: '' }, score: 75 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].score).toBe(70);
    expect(dropped.duplicate).toBe(1);
  });

  it('fills fallback handle when missing', () => {
    const { items } = normalizeSoulmatchRecommendations([
      { user: { id: 5, name: 'Jane Doe', photo: '' } as any, score: 88 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].user.handle).toBe('janedoe');
  });

  it('falls back lens_label from lens', () => {
    const { items } = normalizeSoulmatchRecommendations([
      {
        user: { id: 7, name: 'Lens', handle: 'lens', photo: '' },
        score: 77,
        lens: 'timing_focus',
      },
    ]);
    expect(items[0].lens_label).toBe('Timing Focus');
  });

  it('falls back explanation.short from reason', () => {
    const { items } = normalizeSoulmatchRecommendations([
      {
        user: { id: 8, name: 'Why', handle: 'why', photo: '' },
        score: 81,
        reason: 'Because.',
      },
    ]);
    expect(items[0].explanation?.short).toBe('Because.');
  });
});

describe('normalizeSoulmatchRecsResponse', () => {
  it('handles array payloads', () => {
    const payload = [
      { user: { id: 1, name: 'A', handle: 'a', photo: '' }, score: 70 },
    ];
    const normalized = normalizeSoulmatchRecsResponse(payload as any);
    expect(normalized.results).toHaveLength(1);
  });

  it('handles wrapper payloads with meta', () => {
    const payload = {
      results: [{ user: { id: 2, name: 'B', handle: 'b', photo: '' }, score: 80 }],
      meta: { reason: 'no_candidates' },
    };
    const normalized = normalizeSoulmatchRecsResponse(payload as any);
    expect(normalized.results).toHaveLength(1);
    expect(normalized.meta?.reason).toBe('no_candidates');
  });
});
