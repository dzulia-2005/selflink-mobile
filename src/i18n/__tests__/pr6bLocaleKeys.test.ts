import en from '@i18n/locales/en.json';
import ka from '@i18n/locales/ka.json';
import ru from '@i18n/locales/ru.json';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const current = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      return [current, ...flattenKeys(child, current)];
    }
    return [current];
  });
}

describe('PR6B locale key parity', () => {
  it('keeps soulmatch and astro.natal keysets aligned across en/ru/ka', () => {
    const enKeys = flattenKeys({ soulmatch: en.soulmatch, astro: { natal: en.astro?.natal } });
    const ruKeys = flattenKeys({ soulmatch: ru.soulmatch, astro: { natal: ru.astro?.natal } });
    const kaKeys = flattenKeys({ soulmatch: ka.soulmatch, astro: { natal: ka.astro?.natal } });

    expect(ruKeys).toEqual(enKeys);
    expect(kaKeys).toEqual(enKeys);
    expect(en.soulmatch?.home?.title).toBe('SoulMatch');
  });
});
