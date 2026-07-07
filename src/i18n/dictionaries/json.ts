import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import fr from '@/locales/fr.json';

export const jsonDictionaries = {
  en,
  hi,
  fr,
} as const;

export type SupportedLangFromJson = keyof typeof jsonDictionaries;

export type DictionaryShape = (typeof jsonDictionaries)[SupportedLangFromJson];

