import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

export type AppLanguage = 'en' | 'ru' | 'ka';

const STORAGE_KEY = 'selflink.app.language';
const DEFAULT_LANGUAGE: AppLanguage = 'en';
const SUPPORTED_LANGUAGES: ReadonlyArray<AppLanguage> = ['en', 'ru', 'ka'];

const LANGUAGE_TO_LOCALE: Record<AppLanguage, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  ka: 'ka-GE',
};

let currentLanguage: AppLanguage = DEFAULT_LANGUAGE;
let currentLocale = LANGUAGE_TO_LOCALE[DEFAULT_LANGUAGE];

function isSupportedLanguage(value: string): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

export function normalizeToBaseLanguage(input?: string | null): AppLanguage {
  if (!input) {
    return DEFAULT_LANGUAGE;
  }
  const normalized = input.split(',')[0]?.split(';')[0]?.trim().replace('_', '-');
  if (!normalized) {
    return DEFAULT_LANGUAGE;
  }
  const base = normalized.split('-')[0]?.toLowerCase();
  return base && isSupportedLanguage(base) ? base : DEFAULT_LANGUAGE;
}

function detectDeviceLocale(): string {
  const first = Localization.getLocales()[0];
  return first?.languageTag || LANGUAGE_TO_LOCALE[DEFAULT_LANGUAGE];
}

export function getCanonicalLocale(language: AppLanguage): string {
  return LANGUAGE_TO_LOCALE[language];
}

export function getAppLanguage(): AppLanguage {
  return currentLanguage;
}

export function getAppLocale(): string {
  return currentLocale;
}

export function getAcceptLanguageHeader(): string {
  const fullLocale = currentLocale || getCanonicalLocale(currentLanguage);
  if (currentLanguage === 'en') {
    return `${fullLocale},en;q=0.9`;
  }
  return `${fullLocale},${currentLanguage};q=0.9,en;q=0.8`;
}

export async function initializeLanguage(): Promise<AppLanguage> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  const deviceLocale = detectDeviceLocale();
  const nextLanguage = normalizeToBaseLanguage(stored || deviceLocale);
  currentLanguage = nextLanguage;
  currentLocale = stored ? getCanonicalLocale(nextLanguage) : deviceLocale;
  return currentLanguage;
}

export async function setStoredLanguage(language: AppLanguage): Promise<void> {
  currentLanguage = language;
  currentLocale = getCanonicalLocale(language);
  await AsyncStorage.setItem(STORAGE_KEY, language);
}

export const supportedLanguages = SUPPORTED_LANGUAGES;
