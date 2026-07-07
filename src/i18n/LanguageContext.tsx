import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { SupportedLang } from './langs';
import { defaultLang, supportedLangs } from './langs';
import { tFactory } from './t';

import type { TranslationKeyTyped } from './t';

type LanguageContextValue = {
  lang: SupportedLang;
  setLang: (next: SupportedLang) => void;
  t: (key: TranslationKeyTyped) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'internarea_lang';

function normalizeLang(maybe: string | null | undefined): SupportedLang {
  const m = String(maybe || '').toLowerCase();
  if (supportedLangs.includes(m as SupportedLang)) return m as SupportedLang;
  return defaultLang;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SupportedLang>(defaultLang);

  useEffect(() => {
    const stored = normalizeLang(typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null);
    setLangState(stored);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    const t = tFactory(lang);
    return {
      lang,
      setLang: (next: SupportedLang) => setLangState(next),
      t,
    } satisfies LanguageContextValue;
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

