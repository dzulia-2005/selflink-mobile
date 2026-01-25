import { areStringArraysEqual, buildChannelList, diffChannelSets } from '@utils/realtimeChannels';

describe('realtimeChannels', () => {
  it('buildChannelList dedupes and sorts', () => {
    const list = buildChannelList(['post:2', 'post:1', 'post:2']);
    expect(list).toEqual(['post:1', 'post:2']);
  });

  it('areStringArraysEqual compares by value', () => {
    expect(areStringArraysEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(areStringArraysEqual(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(areStringArraysEqual(['a'], ['a', 'b'])).toBe(false);
  });

  it('diffChannelSets returns added and removed', () => {
    const prev = new Set(['post:1', 'post:2']);
    const next = new Set(['post:2', 'post:3']);
    const diff = diffChannelSets(prev, next);
    expect(diff.added.sort()).toEqual(['post:3']);
    expect(diff.removed.sort()).toEqual(['post:1']);
  });
});
