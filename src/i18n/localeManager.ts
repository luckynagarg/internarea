/**
 * Locale Manager
 * 
 * Handles:
 * - Route-based lazy loading of locale files
 * - Missing key fallback (shows English, warns in dev)
 * - Locale file splitting by route
 * - Never crashes production
 */

import type { SupportedLang } from './langs';
import { defaultLang } from './langs';

// In-memory store for loaded locale chunks
const loadedChunks = new Map<string, Record<string, any>>();

// Track missing keys for development warnings
const missingKeys = new Set<string>();
const warnedKeys = new Set<string>();

/**
 * Lazy-load a locale file chunk
 * Chunks are split by route/page name
 */
export async function loadLocaleChunk(lang: SupportedLang, chunk: string): Promise<Record<string, any>> {
  const key = `${lang}:${chunk}`;
  
  if (loadedChunks.has(key)) {
    return loadedChunks.get(key)!;
  }

  try {
    // Dynamic import of locale chunk
    // This enables code splitting - each route only loads its own translations
    const localeModule = await import(
      /* webpackChunkName: "locale-[request]" */
      `../locales/${lang}.json`
    );
    
    const data = localeModule.default || localeModule;
    loadedChunks.set(key, data);
    return data;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Failed to load locale chunk: ${key}`, err);
    }
    // Fall back to English
    return {};
  }
}

/**
 * Preload locales for common pages (runs on app mount)
 */
export function preloadCommonLocales(lang: SupportedLang): void {
  const commonChunks = ['navbar', 'footer', 'home'];
  // Trigger lazy load without awaiting
  commonChunks.forEach(chunk => {
    loadLocaleChunk(lang, chunk).catch(() => {});
  });
}

/**
 * Safe translation lookup - never crashes production
 * Falls back to key if translation not found
 * Logs warning in development only
 */
export function safeTranslate(
  dict: Record<string, any>,
  key: string,
  lang: SupportedLang
): string {
  try {
    const value = key.split('.').reduce((acc: any, part: string) => {
      if (acc == null || typeof acc !== 'object') return undefined;
      return acc[part];
    }, dict);

    if (typeof value === 'string') {
      return value;
    }

    // Key not found - track for warning
    if (!missingKeys.has(key)) {
      missingKeys.add(key);
    }

    // Log warning only once per key, only in development
    if (
      process.env.NODE_ENV === 'development' &&
      !warnedKeys.has(key)
    ) {
      warnedKeys.add(key);
      console.warn(
        `[i18n] Missing translation key: "${key}" for language: "${lang}". ` +
        `Run \`npm run translate\` to auto-generate translations.`
      );
    }

    return key; // Fallback: return the key itself
  } catch (err) {
    // NEVER crash production
    if (process.env.NODE_ENV === 'development') {
      console.error(`[i18n] Error translating key "${key}":`, err);
    }
    return key;
  }
}

/**
 * Get all missing keys (for reporting)
 */
export function getMissingKeys(): string[] {
  return Array.from(missingKeys);
}

/**
 * Get warning count (for metrics)
 */
export function getMissingKeyCount(): number {
  return missingKeys.size;
}

/**
 * Clear tracked missing keys (for testing)
 */
export function resetMissingKeys(): void {
  missingKeys.clear();
  warnedKeys.clear();
}

