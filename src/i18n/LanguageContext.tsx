'use client';

import React, { createContext, useContext } from 'react';
import { useT, type SupportedLang } from './runtime';

type LanguageContextValue = {
  lang: SupportedLang;
  setLang: (next: SupportedLang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lang, setLang, t } = useT();

  const value: LanguageContextValue = {
    lang,
    setLang,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);

  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return ctx;
}
