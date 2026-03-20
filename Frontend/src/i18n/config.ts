import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import he from './locales/he.json';
import en from './locales/en.json';

// Get stored language preference or default to Hebrew
const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('i18nextLng');
    if (stored) {
      if (stored.startsWith('he')) return 'he';
      if (stored.startsWith('en')) return 'en';
    }
  }
  return 'he'; // Default to Hebrew if no preference stored
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      he: { translation: he },
      en: { translation: en },
    },
    // Default to Hebrew, fallback to English if needed
    fallbackLng: 'he',
    lng: getInitialLanguage(), // Use stored preference or default to Hebrew
    // Normalize he-IL / he_IL to he so RTL and resources stay consistent
    load: 'languageOnly',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      // Ensure localStorage is checked first
      checkWhitelist: true,
    },
  });

export default i18n;

