import en from '@i18n/locales/en.json';
import ka from '@i18n/locales/ka.json';
import ru from '@i18n/locales/ru.json';

function flattenKeys(node: unknown, prefix = ''): string[] {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return [];
  }

  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return [next, ...flattenKeys(value, next)];
    }
    return [next];
  });
}

function flattenLeafValues(
  node: unknown,
  prefix = '',
): Array<{ key: string; value: unknown }> {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return [];
  }

  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenLeafValues(value, next);
    }
    return [{ key: next, value }];
  });
}

describe('Locale key parity', () => {
  it('en, ru, ka have identical i18n key sets', () => {
    const enKeys = new Set(flattenKeys(en));
    const ruKeys = new Set(flattenKeys(ru));
    const kaKeys = new Set(flattenKeys(ka));

    const missingInRu = [...enKeys].filter((key) => !ruKeys.has(key));
    const missingInKa = [...enKeys].filter((key) => !kaKeys.has(key));
    const extraInRu = [...ruKeys].filter((key) => !enKeys.has(key));
    const extraInKa = [...kaKeys].filter((key) => !enKeys.has(key));

    expect(missingInRu).toEqual([]);
    expect(missingInKa).toEqual([]);
    expect(extraInRu).toEqual([]);
    expect(extraInKa).toEqual([]);
  });

  it('en leaf values are non-empty strings', () => {
    const leaves = flattenLeafValues(en);
    for (const { key, value } of leaves) {
      expect(typeof value).toBe('string');
      expect((value as string).trim().length).toBeGreaterThan(0);
      expect((value as string).trim()).not.toBe(key);
    }
  });
});
