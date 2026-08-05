# 🌐 InternArea i18n Architecture

## Overview

Production-grade internationalization system designed for 1000+ pages with zero manual maintenance.

## Architecture

```
src/
├── i18n/
│   ├── index.ts              # Barrel exports
│   ├── LanguageContext.tsx     # React context provider
│   ├── langs.ts               # Language definitions
│   ├── t.ts                   # Base translation function
│   ├── Trans.tsx              # <Trans> component
│   ├── tWithFallback.ts       # Enhanced t() with interpolation
│   ├── localeManager.ts       # Lazy loading, missing key fallback
│   ├── i18n-types.ts          # TypeScript types
│   └── services/
│       └── translationService.ts  # Provider abstraction
├── locales/
│   ├── en.json                # Source language (English)
│   ├── hi.json                # Hindi (auto-generated)
│   ├── fr.json                # French (auto-generated)
│   ├── es.json                # Spanish (auto-generated)
│   ├── pt.json                # Portuguese (auto-generated)
│   ├── zh.json                # Chinese (auto-generated)
│   └── de.json                # German (auto-generated)
scripts/
├── extract-strings.ts         # Find new translatable strings
├── generate-locales.ts        # CLI: npm run translate
├── locale-utils.ts            # Shared utilities
└── check-translations.ts      # Health check
.github/workflows/
└── i18n-auto-translate.yml    # CI/CD auto-translation
```

## Quick Start

### 1. Develop with translations

```tsx
// Simple translation
import { useLanguage } from '@/i18n';

function MyComponent() {
  const { t } = useLanguage();
  return <h1>{t('home.hero.title')}</h1>;
}

// With <Trans> component
import { Trans } from '@/i18n';

function MyComponent() {
  return <Trans>Welcome to InternArea</Trans>;
}

// With interpolation
const { t } = useLanguage();
t('welcome_user', { name: 'John' }); // "Welcome, John!"
```

### 2. Auto-generate translations

```bash
# Extract new strings + translate all missing keys
npm run translate

# Dry run (preview only)
npm run translate:dry

# Translate only to Hindi
npm run translate:hi

# Force re-translate everything
npm run translate:force

# Just extract strings (update en.json)
npm run i18n:extract

# Check translation health
npm run i18n:status
```

### 3. Admin dashboard

Visit `/admin/translations` to:
- View coverage per language
- Find missing/duplicate/unused keys
- Export translation reports
- Import translations

## Key Features

### 🔄 Automatic Translation Pipeline
- English is the single source of truth
- Other languages auto-generated via Google/DeepL/OpenAI/LibreTranslate
- Only missing keys are translated (never overwrites existing)
- Cached to avoid re-translating the same string

### 📦 Lazy Loading
- Locale files are loaded on demand per route
- No bundling all languages together
- Reduces initial bundle size

### 🛡️ Safety
- Never deletes existing translations
- Never overwrites manual edits
- Missing keys show English + dev warning
- Never crashes production

### 🔧 Provider Abstraction
Switch translation providers via environment variable:

```env
NEXT_PUBLIC_TRANSLATION_PROVIDER=google   # Default
NEXT_PUBLIC_TRANSLATION_PROVIDER=deepl
NEXT_PUBLIC_TRANSLATION_PROVIDER=openai
NEXT_PUBLIC_TRANSLATION_PROVIDER=libre
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_TRANSLATION_PROVIDER` | No | Translation API provider (default: google) |
| `GOOGLE_TRANSLATE_API_KEY` | For Google | Google Cloud Translation API key |
| `DEEPL_API_KEY` | For DeepL | DeepL API key |
| `OPENAI_API_KEY` | For OpenAI | OpenAI API key |
| `LIBRETRANSLATE_URL` | For Libre | Self-hosted LibreTranslate URL |
| `LIBRETRANSLATE_API_KEY` | For Libre | LibreTranslate API key |

## CI/CD

On every Pull Request, the GitHub Action:
1. Detects new/changed English strings
2. Generates translations for all languages
3. Updates locale files
4. Commits changes automatically

## Adding a New Language

1. Add to `langs.ts`:
```ts
export type SupportedLang = '...' | 'ja';  // Add 'ja'
export const supportedLangs = ['...', 'ja'];
export const langLabel = { ..., ja: '日本語' };
```

2. Run `npm run translate -- --lang=ja`

Done. All strings are auto-translated.

## Testing

```bash
# Run health check
npm run i18n:status

# Expected output:
# 📈 Average coverage: 100%
# 🚀 Run `npm run translate` if coverage < 100%
```

## Performance

- Route-based splitting: each page only loads its own translations
- Translation cache: never translate same string twice
- Production fallback: missing keys return English, no crashes
- Development warnings: console.warn for missing keys during dev only

## Principles

1. **English is source of truth** - Write once, translate everywhere
2. **Automation over manual work** - CLI and CI/CD handle everything
3. **Safety first** - Never lose or overwrite translations
4. **Performance by default** - Lazy loading, no bloat
5. **Developer experience** - Just use `t()` or `<Trans>`, system handles the rest

