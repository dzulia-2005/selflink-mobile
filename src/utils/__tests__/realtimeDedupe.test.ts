import { createRealtimeDedupeStore } from '@utils/realtimeDedupe';

describe('createRealtimeDedupeStore', () => {
  it('dedupes repeated ids', () => {
    const store = createRealtimeDedupeStore(10);
    expect(store.add(123)).toBe(true);
    expect(store.add(123)).toBe(false);
    expect(store.has(123)).toBe(true);
    expect(store.size()).toBe(1);
  });

  it('bounds size and evicts oldest', () => {
    const store = createRealtimeDedupeStore(3);
    store.add('a');
    store.add('b');
    store.add('c');
    expect(store.size()).toBe(3);
    store.add('d');
    expect(store.size()).toBe(3);
    expect(store.has('a')).toBe(false);
    expect(store.has('d')).toBe(true);
  });

  it('ignores null/undefined keys', () => {
    const store = createRealtimeDedupeStore(5);
    expect(store.add(null)).toBe(true);
    expect(store.add(undefined)).toBe(true);
    expect(store.size()).toBe(0);
  });
});
