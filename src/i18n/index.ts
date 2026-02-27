import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { initializeLanguage, normalizeToBaseLanguage } from './language';
import en from './locales/en.json';
import ka from './locales/ka.json';
import ru from './locales/ru.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  ka: { translation: ka },
} as const;

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v4',
      resources,
      lng: 'en',
      supportedLngs: ['en', 'ru', 'ka'],
      nonExplicitSupportedLngs: true,
      fallbackLng: (code?: string) => {
        const base = normalizeToBaseLanguage(code);
        if (base === 'ka') {
          return ['ka', 'en'];
        }
        if (base === 'ru') {
          return ['ru', 'en'];
        }
        return ['en'];
      },
      interpolation: { escapeValue: true },
      returnNull: false,
      react: { useSuspense: false },
    })
    .catch((error: unknown) => {
      console.warn('i18n: init failed', error);
    });

  if (__DEV__) {
    i18n.on('missingKey', (_lng: unknown, _ns: unknown, key: string) => {
      console.warn(`i18n: missing key "${key}"`);
    });
  }
}

export async function bootstrapI18n(): Promise<void> {
  const language = await initializeLanguage();
  if (i18n.language !== language) {
    await i18n.changeLanguage(language);
  }
}

export { i18n };
