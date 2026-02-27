import { useCallback, useEffect, useState } from 'react';

import { i18n } from './index';
import {
  type AppLanguage,
  getAppLanguage,
  getAppLocale,
  normalizeToBaseLanguage,
  setStoredLanguage,
  supportedLanguages,
} from './language';

export function useAppLanguage() {
  const [language, setLanguageState] = useState<AppLanguage>(
    normalizeToBaseLanguage(getAppLanguage()),
  );

  useEffect(() => {
    const handler = (nextLanguage: string) => {
      setLanguageState(normalizeToBaseLanguage(nextLanguage));
    };
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, []);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    const normalized = normalizeToBaseLanguage(next);
    await setStoredLanguage(normalized);
    if (i18n.language !== normalized) {
      await i18n.changeLanguage(normalized);
    }
    setLanguageState(normalized);
  }, []);

  return {
    language,
    locale: getAppLocale(),
    setLanguage,
    supportedLanguages,
  };
}
