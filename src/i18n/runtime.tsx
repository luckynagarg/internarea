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
 *   5. t() supports interpolation ({name}) and pluralization (count option).
 *
 * Usage:
 *   import { useT } from '@/i18n/runtime';
 *   const { t, lang, setLang } = useT();
 *   <h1>{t('home.hero.title')}</h1>
 *   {t('public.canPostTimes', { count: 3 })}
 *   {t.plural('item', { one: '1 item', other: '{count} items' }, n)}
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
// Requirement: exactly 6 supported languages (en/es/hi/pt/zh/fr).
export type SupportedLang =
  | 'en' | 'es' | 'hi' | 'pt' | 'zh' | 'fr';

export const SUPPORTED_LANGS: SupportedLang[] = [
  'en', 'es', 'hi', 'pt', 'zh', 'fr',
];

export const DEFAULT_LANG: SupportedLang = 'en';

export const LANG_LABELS: Record<SupportedLang, string> = {
  en: 'English',
  es: 'Español',
  hi: 'हिन्दी',
  pt: 'Português',
  zh: '中文',
  fr: 'Français',
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
};

// ─── Warning tracker ───────────────────────────────────────────────────
let warnedKeys = new Set<string>();

// ─── Interpolation ─────────────────────────────────────────────────────
const VAR_RE = /\{(\w+)\}/g;

export function interpolate(
  text: string,
  values?: Record<string, string | number>
): string {
  if (!values) return text;
  return text.replace(VAR_RE, (_m, k: string) => {
    const v = values[k];
    return v != null ? String(v) : `{${k}}`;
  });
}

/**
 * Resolve pluralization. Tries suffixed keys (`_zero`, `_one`, `_other`)
 * within the dictionary, then falls back to the base key.
 */
export function resolvePlural(
  dict: LocaleDict,
  enDict: LocaleDict,
  key: string,
  count: number
): string | undefined {
  const langsOrder: string[] = ['zero', 'one', 'other'];
  for (const form of langsOrder) {
    const suffixKey = form === 'other' ? `${key}` : `${key}_${form}`;
    // try `key_one`, `key_other`, `key_zero`
    let v = getByPath(dict, suffixKey);
    if (v == null) v = getByPath(enDict, suffixKey);
    if (typeof v === 'string') return v;
  }
  // bare key with {count} interpolation
  let v = getByPath(dict, key);
  if (typeof v !== 'string') v = getByPath(enDict, key);
  return typeof v === 'string' ? v : undefined;
}

// ─── Context ───────────────────────────────────────────────────────────
export type TranslateOptions = {
  values?: Record<string, string | number>;
  count?: number;
};

interface I18nContextValue {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
  t: ((key: string, options?: TranslateOptions) => string) & {
    plural?: (
      key: string,
      forms: { zero?: string; one: string; other: string },
      count: number
    ) => string;
  };
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

/**
 * Return an ISO locale tag for the current language (e.g. 'en-US', 'hi-IN',
 * 'zh-CN', 'fr-FR'). Used by Intl formatters for date/currency/number.
 */
export function langToLocale(lang: SupportedLang): string {
  const map: Record<SupportedLang, string> = {
    en: 'en-US',
    es: 'es-ES',
    hi: 'hi-IN',
    pt: 'pt-BR',
    zh: 'zh-CN',
    fr: 'fr-FR',
  };
  return map[lang] || 'en-US';
}

// ─── Pure t() factory ──────────────────────────────────────────────────
function createT(lang: SupportedLang): I18nContextValue['t'] {
  const dict = localeData[lang];
  const enDict = localeData[DEFAULT_LANG];

  const tFn = (key: string, options?: TranslateOptions): string => {
    let text: string | undefined;

    // Pluralization path
    if (options && typeof options.count === 'number') {
      const resolved = resolvePlural(dict, enDict, key, options.count);
      if (resolved) {
        text = interpolate(resolved, {
          ...options.values,
          count: options.count,
        });
      }
    }

    // Normal lookup
    if (!text) {
      // 1. Try selected language's dictionary
      if (dict) {
        const v = getByPath(dict, key);
        if (typeof v === 'string') text = v;
      }
      // 2. Fallback to English dictionary
      if (!text && enDict) {
        const v = getByPath(enDict, key);
        if (typeof v === 'string') text = v;
      }
      // 3. Interpolate values
      if (text && options?.values) {
        text = interpolate(text, options.values);
      }
      if (text && typeof options?.count === 'number' && text.includes('{count}')) {
        text = interpolate(text, { count: options.count });
      }
    }

    // 4. Warn in dev only (once per key)
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'development' &&
      !text &&
      !warnedKeys.has(key)
    ) {
      warnedKeys.add(key);
      console.warn(
        `[i18n] Missing translation key: "${key}" for lang: "${lang}". ` +
        `No English fallback either. Returning last segment.`
      );
    }

    // 5. NEVER show raw keys — return last segment of path
    //    e.g. "navbar.jobs" → "jobs"
    if (!text) {
      const segs = key.split('.');
      return segs[segs.length - 1] || key;
    }
    return text;
  };

  // Explicit plural helper: t.plural('item', { one, other, zero }, count)
  tFn.plural = (
    key: string,
    forms: { zero?: string; one: string; other: string },
    count: number
  ): string => {
    let chosen: string;
    if (count === 0 && forms.zero != null) chosen = forms.zero;
    else if (count === 1) chosen = forms.one;
    else chosen = forms.other;
    return interpolate(chosen, { count });
  };

  return tFn;
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
  const t = useMemo(
    () => createT(lang),
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
