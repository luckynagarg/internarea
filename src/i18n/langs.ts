export type SupportedLang = 'en' | 'es' | 'hi' | 'pt' | 'zh' | 'fr' | 'de';

export const supportedLangs: SupportedLang[] = ['en', 'es', 'hi', 'pt', 'zh', 'fr', 'de'];

export const defaultLang: SupportedLang = 'en';

export const langLabel: Record<SupportedLang, string> = {
  en: 'English',
  es: 'Español',
  hi: 'हिन्दी',
  pt: 'Português',
  zh: '中文',
  fr: 'Français',
  de: 'Deutsch',
};

