import { normalizeSoulmatchRecommendations } from '@utils/soulmatchRecommendations';

describe('normalizeSoulmatchRecommendations', () => {
  it('filters entries without user or score', () => {
    const { items, dropped } = normalizeSoulmatchRecommendations([
      { user: null, score: 90 },
      { user: { id: 2, name: 'Test', handle: 'test' }, score: NaN },
      { user: { id: 3, name: 'Valid', handle: 'valid' }, score: 82 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].user.id).toBe(3);
    expect(dropped.missing_user).toBe(1);
    expect(dropped.missing_score).toBe(1);
  });

  it('drops entries missing user id', () => {
    const { items, dropped } = normalizeSoulmatchRecommendations([
      { user: { name: 'MissingId', handle: 'missing' }, score: 70 },
    ]);
    expect(items).toHaveLength(0);
    expect(dropped.missing_user_id).toBe(1);
  });

  it('dedupes by user id', () => {
    const { items, dropped } = normalizeSoulmatchRecommendations([
      { user: { id: 1, name: 'A', handle: 'a' }, score: 70 },
      { user: { id: 1, name: 'A', handle: 'a' }, score: 75 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].score).toBe(70);
    expect(dropped.duplicate).toBe(1);
  });

  it('fills fallback handle when missing', () => {
    const { items } = normalizeSoulmatchRecommendations([
      { user: { id: 5, name: 'Jane Doe' }, score: 88 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].user.handle).toBe('janedoe');
  });
});
