/**
 * Enhanced t() function with:
 * - Missing key fallback (shows English, never crashes)
 * - Development warnings
 * - Placeholder interpolation
 * - Pluralization support
 */

import { useLanguage } from './LanguageContext';
import { getMissingKeyCount } from './localeManager';

/**
 * Hook that returns an enhanced translate function
 * with string interpolation and pluralization
 */
export function useEnhancedT() {
  const { t: baseT, lang } = useLanguage();

  /**
   * Translate with placeholder interpolation
   * 
   * Usage:
   *   t("Welcome {name}", { name: "John" })
   *   t("You have {count} messages", { count: 5 })
   */
  function t(key: string, values?: Record<string, string | number>): string {
    let text = baseT(key);

    // If baseT returned the key itself, it means translation is missing
    // In development, the warning has already been logged
    if (text === key) {
      return key; // Return key as fallback
    }

    // Interpolate values
    if (values) {
      text = text.replace(/\{(\w+)\}/g, (_, name) => {
        const val = values[name];
        return val != null ? String(val) : `{${name}}`;
      });
    }

    return text;
  }

  /**
   * Pluralization support
   * 
   * Usage:
   *   t.plural("item", { one: "1 item", other: "{count} items" }, 5)
   */
  t.plural = function(
    key: string,
    forms: { zero?: string; one: string; other: string },
    count: number
  ): string {
    if (count === 0 && forms.zero) {
      return baseT(forms.zero).replace('{count}', String(count));
    }
    if (count === 1) {
      return baseT(forms.one).replace('{count}', String(count));
    }
    return baseT(forms.other).replace('{count}', String(count));
  };

  /**
   * Check if a key exists in the current locale
   */
  t.exists = function(key: string): boolean {
    const result = baseT(key);
    return result !== key;
  };

  /**
   * Get count of missing keys (dev tool)
   */
  t.getMissingCount = getMissingKeyCount;

  return { t, lang };
}

export default useEnhancedT;

