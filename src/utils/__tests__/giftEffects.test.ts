import {
  parseGiftEffects,
  pickHighestPriorityEffect,
  resolveActiveCardEffects,
} from '@utils/giftEffects';

describe('giftEffects', () => {
  it('parses effects with window persistence', () => {
    const parsed = parseGiftEffects({
      version: 2,
      effects: [{ type: 'border_glow', color: '#fff' }],
      persist: { mode: 'window', window_seconds: 90 },
    });
    expect(parsed.version).toBe(2);
    expect(parsed.effects).toHaveLength(1);
    expect(parsed.persist.mode).toBe('window');
    expect(parsed.persist.windowSeconds).toBe(90);
  });

  it('resolves windowed effects based on created_at', () => {
    const now = Date.parse('2025-01-01T00:00:30Z');
    const effects = resolveActiveCardEffects({
      now,
      recentGifts: [
        {
          created_at: '2025-01-01T00:00:00Z',
          gift_type: {
            name: 'Spark',
            effects: {
              effects: [{ type: 'badge', text: 'Hot' }],
              persist: { mode: 'window', window_seconds: 60 },
            },
          },
        },
      ],
    });
    expect(effects.badge?.text).toBe('Hot');
  });

  it('chooses highest priority effect', () => {
    const chosen = pickHighestPriorityEffect([
      { type: 'badge', priority: 1 },
      { type: 'badge', priority: 5 },
    ]);
    expect(chosen?.priority).toBe(5);
  });

  it('prefers newest when priority ties', () => {
    const chosen = pickHighestPriorityEffect([
      { type: 'highlight', priority: 2, createdAt: 10 },
      { type: 'highlight', priority: 2, createdAt: 20 },
    ]);
    expect(chosen?.createdAt).toBe(20);
  });

  it('handles missing effects safely', () => {
    const effects = resolveActiveCardEffects({
      now: Date.now(),
      recentGifts: [{ created_at: '2025-01-01T00:00:00Z', gift_type: {} }],
    });
    expect(effects.borderGlow).toBeUndefined();
    expect(effects.highlight).toBeUndefined();
    expect(effects.badge).toBeUndefined();
  });
});
