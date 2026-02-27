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

describe('PR8A onboarding/shared locale key parity', () => {
  it('keeps onboarding, splash, and common error/modal keys aligned across en/ru/ka', () => {
    const enKeys = flattenKeys({
      onboarding: en.onboarding,
      splash: en.splash,
      common: { error: en.common?.error, modal: en.common?.modal },
    });
    const ruKeys = flattenKeys({
      onboarding: ru.onboarding,
      splash: ru.splash,
      common: { error: ru.common?.error, modal: ru.common?.modal },
    });
    const kaKeys = flattenKeys({
      onboarding: ka.onboarding,
      splash: ka.splash,
      common: { error: ka.common?.error, modal: ka.common?.modal },
    });

    expect(ruKeys).toEqual(enKeys);
    expect(kaKeys).toEqual(enKeys);
    expect(en.splash?.loading).toBe('Preparing SelfLink...');
  });
});
