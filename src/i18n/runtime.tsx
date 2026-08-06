/**
 * Runtime i18n Engine — SINGLE SOURCE OF TRUTH
 *
 * Strategy:
 *   1. Load ALL translation dictionaries synchronously via static imports.
 *      Each dict is a TypeScript file containing all keys for that language.
 *      If a language's dict is incomplete, English keys fill the gaps.
 *   2. English is ALWAYS the fallback — no raw keys shown to users.
 *      If even English is missing, returns the last segment of the key.
 *   3. Language is persisted in localStorage, restored on mount.
 *   4. setLang() triggers immediate re-render via React context.
 *
 * Usage:
 *   import { useT } from '@/i18n/runtime';
 *   const { t, lang, setLang } = useT();
 *   <h1>{t('home.hero.title')}</h1>
 */

'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// ─── Types & Constants ─────────────────────────────────────────────────
export type SupportedLang =
  | 'en' | 'es' | 'hi' | 'pt' | 'zh' | 'fr' | 'de';

export const SUPPORTED_LANGS: SupportedLang[] = [
  'en', 'es', 'hi', 'pt', 'zh', 'fr', 'de',
];

export const DEFAULT_LANG: SupportedLang = 'en';

export const LANG_LABELS: Record<SupportedLang, string> = {
  en: 'English',
  es: 'Español',
  hi: 'हिन्दी',
  pt: 'Português',
  zh: '中文',
  fr: 'Français',
  de: 'Deutsch',
};

const STORAGE_KEY = 'internarea_lang';

// ─── Load all dictionaries via static ESM imports ──────────────────────
// These are the TypeScript `dictionaries/*.ts` files.
// en.ts is the most comprehensive; other languages may have fewer keys.
// The runtime handles this by falling back to English for missing keys.

import en from './dictionaries/en';
import hi from './dictionaries/hi';
import fr from './dictionaries/fr';
import es from './dictionaries/es';
import pt from './dictionaries/pt';
import zh from './dictionaries/zh';
import de from './dictionaries/de';

type LocaleDict = Record<string, any>;

function resolveLocaleModule(module: unknown, lang: SupportedLang): LocaleDict {
  const m = module as any;
  if (!m) return {};
  if (m.default && typeof m.default === 'object') return m.default as LocaleDict;
  if (m[lang] && typeof m[lang] === 'object') return m[lang] as LocaleDict;
  return (m as LocaleDict) || {};
}

const localeData: Record<string, LocaleDict> = {
  en: resolveLocaleModule(en, 'en'),
  hi: resolveLocaleModule(hi, 'hi'),
  fr: resolveLocaleModule(fr, 'fr'),
  es: resolveLocaleModule(es, 'es'),
  pt: resolveLocaleModule(pt, 'pt'),
  zh: resolveLocaleModule(zh, 'zh'),
  de: resolveLocaleModule(de, 'de'),
};

// ─── Warning tracker ───────────────────────────────────────────────────
let warnedKeys = new Set<string>();

// ─── Context ───────────────────────────────────────────────────────────
interface I18nContextValue {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ─── Deep-get helper ───────────────────────────────────────────────────
function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc: any, part: string) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    if (Object.prototype.hasOwnProperty.call(acc, part)) return acc[part];
    return undefined;
  }, obj);
}

function normalizeLang(maybe: string | null): SupportedLang {
  const m = String(maybe || '').toLowerCase();
  if (SUPPORTED_LANGS.includes(m as SupportedLang)) return m as SupportedLang;
  return DEFAULT_LANG;
}

// ─── Pure t() factory ──────────────────────────────────────────────────
function createT(lang: SupportedLang): (key: string) => string {
  const dict = localeData[lang];
  const enDict = localeData[DEFAULT_LANG];

  return (key: string): string => {
    // 1. Try selected language's dictionary
    if (dict) {
      const v = getByPath(dict, key);
      if (typeof v === 'string') return v;
    }

    // 2. Fallback to English dictionary
    if (enDict) {
      const v = getByPath(enDict, key);
      if (typeof v === 'string') return v;
    }

    // 3. Warn in dev only (once per key)
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'development' &&
      !warnedKeys.has(key)
    ) {
      warnedKeys.add(key);
      console.warn(
        `[i18n] Missing translation key: "${key}" for lang: "${lang}". ` +
        `No English fallback either. Returning last segment.`
      );
    }

    // 4. NEVER show raw keys — return last segment of path
    //    e.g. "navbar.jobs" → "jobs"
    const segs = key.split('.');
    return segs[segs.length - 1] || key;
  };
}

// ─── Provider ──────────────────────────────────────────────────────────
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>(DEFAULT_LANG);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = normalizeLang(
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null
    );
    setLangState(stored);
    setHydrated(true);
  }, []);

  // Persist to localStorage on change & update <html lang>
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    }
  }, [lang, hydrated]);

  const setLang = useCallback((next: SupportedLang) => {
    setLangState(next);
  }, []);

  // t() changes whenever lang changes → all subscribers re-render
  const t = useCallback(
    (key: string): string => {
      return createT(lang)(key);
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────
export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within I18nProvider');
  return ctx;
}

// ─── Utility ───────────────────────────────────────────────────────────
export function resetWarnings(): void {
  warnedKeys = new Set();
}
