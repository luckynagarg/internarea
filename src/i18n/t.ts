import type { SupportedLang } from './langs';

import en from './dictionaries/en';
import es from './dictionaries/es';
import hi from './dictionaries/hi';
import pt from './dictionaries/pt';
import zh from './dictionaries/zh';
import fr from './dictionaries/fr';
import de from './dictionaries/de';

const dictionaries = {
  en,
  es,
  hi,
  pt,
  zh,
  fr,
  de,
} as const;

type Dict = (typeof dictionaries)[keyof typeof dictionaries];

function getByPath(obj: any, path: string) {
  return path.split('.').reduce((acc, part) => {
    if (acc == null) return undefined;
    return acc[part];
  }, obj);
}

export function tFactory(lang: SupportedLang) {
  const dict = dictionaries[lang] as Dict;
  return (key: string) => {
    const v = getByPath(dict, key);
    if (typeof v === 'string') return v;
    return key;
  };
}

