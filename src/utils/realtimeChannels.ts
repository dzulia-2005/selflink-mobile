export type ChannelDiff = {
  added: string[];
  removed: string[];
};

export const buildChannelList = (channels: Iterable<string>): string[] => {
  const deduped = new Set<string>();
  for (const channel of channels) {
    if (channel) {
      deduped.add(channel);
    }
  }
  return Array.from(deduped).sort();
};

export const areStringArraysEqual = (a: string[], b: string[]): boolean => {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

export const diffChannelSets = (
  prev: Iterable<string>,
  next: Iterable<string>,
): ChannelDiff => {
  const prevSet = new Set(prev);
  const nextSet = new Set(next);
  const added: string[] = [];
  const removed: string[] = [];

  nextSet.forEach((channel) => {
    if (!prevSet.has(channel)) {
      added.push(channel);
    }
  });

  prevSet.forEach((channel) => {
    if (!nextSet.has(channel)) {
      removed.push(channel);
    }
  });

  return { added, removed };
};
