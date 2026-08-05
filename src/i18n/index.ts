/**
 * i18n barrel exports
 *
 * No manual dictionaries. Just runtime hooks and types.
 */
export {
  I18nProvider,
  useT,
  resetWarnings,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  LANG_LABELS,
} from './runtime';

export type { SupportedLang } from './runtime';
