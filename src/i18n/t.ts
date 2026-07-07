import type { SupportedLang } from './langs';
import { defaultLang } from './langs';

import { jsonDictionaries, type DictionaryShape, type SupportedLangFromJson } from './dictionaries/json';
import type { TranslationKey } from './i18n-types';

function getByPath(obj: any, path: string) {
  return path.split('.').reduce((acc, part) => {
    if (acc == null) return undefined;
    return acc[part];
  }, obj);
}

// Derived from the JSON shape. We still accept it as `string` at the factory boundary
// because LanguageContext is instantiated with `SupportedLang` and React typing sometimes widens generics.
export type TranslationKeyTyped = TranslationKey<DictionaryShape>;

export function tFactory(lang: SupportedLang) {
  // Always compute fallback values in case a key is missing in the selected language.
  const primaryLang = (jsonDictionaries as Record<string, DictionaryShape>)[lang]
    ? (lang as SupportedLangFromJson)
    : (defaultLang as SupportedLangFromJson);

  const primaryDict = jsonDictionaries[primaryLang] as DictionaryShape;
  const fallbackDict = jsonDictionaries[defaultLang as SupportedLangFromJson] as DictionaryShape;

  return (key: TranslationKeyTyped) => {
    const primary = getByPath(primaryDict, key);
    if (typeof primary === 'string') return primary;

    const fallback = getByPath(fallbackDict, key);
    if (typeof fallback === 'string') return fallback;

    // If neither primary nor fallback has the key, return a visible placeholder.
    return key;
  };
}

