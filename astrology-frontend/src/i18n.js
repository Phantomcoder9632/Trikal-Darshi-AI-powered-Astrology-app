import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      bn: { translation: bn },
    },
    // Map internal backend language names to i18next language codes
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already handles escaping
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

/**
 * Map backend language names (english/hindi/bengali)
 * to i18next language codes (en/hi/bn).
 */
export function backendLangToI18n(lang) {
  const map = { english: 'en', hindi: 'hi', bengali: 'bn' };
  return map[lang?.toLowerCase()] || 'en';
}

/**
 * Map i18next language codes (en/hi/bn)
 * to backend language names (english/hindi/bengali).
 */
export function i18nLangToBackend(code) {
  const map = { en: 'english', hi: 'hindi', bn: 'bengali' };
  return map[code] || 'english';
}

export default i18n;
