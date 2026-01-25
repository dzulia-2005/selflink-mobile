type DedupeKey = string | number;

export type RealtimeDedupeStore = {
  add: (id: DedupeKey | null | undefined) => boolean;
  has: (id: DedupeKey | null | undefined) => boolean;
  size: () => number;
};

export const createRealtimeDedupeStore = (maxSize = 200): RealtimeDedupeStore => {
  const seen = new Set<string>();
  let queue: string[] = [];
  let head = 0;

  const normalize = (id: DedupeKey) => String(id);

  const compactQueue = () => {
    if (head > 100) {
      queue = queue.slice(head);
      head = 0;
    }
  };

  const add = (id: DedupeKey | null | undefined) => {
    if (id === null || id === undefined) {
      return true;
    }
    const key = normalize(id);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    queue.push(key);
    while (queue.length - head > maxSize) {
      const remove = queue[head];
      head += 1;
      seen.delete(remove);
    }
    compactQueue();
    return true;
  };

  const has = (id: DedupeKey | null | undefined) => {
    if (id === null || id === undefined) {
      return false;
    }
    return seen.has(normalize(id));
  };

  const size = () => seen.size;

  return { add, has, size };
};
