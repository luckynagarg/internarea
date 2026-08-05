/**
 * Translation Service Abstraction
 * 
 * Supports: Google Cloud Translation API, DeepL API, OpenAI API, LibreTranslate
 * Can be switched via environment variable: NEXT_PUBLIC_TRANSLATION_PROVIDER
 * 
 * Usage:
 *   const translator = getTranslationProvider();
 *   const result = await translator.translate("Hello", "hi");
 */

export type TranslationProvider = 'google' | 'deepl' | 'openai' | 'libre';
export type SupportedTargetLang = 'es' | 'hi' | 'pt' | 'zh' | 'fr' | 'de';

interface TranslateResult {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

interface TranslationCache {
  [key: string]: {
    [lang: string]: string;
  };
}

// In-memory cache to avoid re-translating same strings
const translationCache: TranslationCache = {};
const CACHE_KEY_PREFIX = 'i18n_cache_';

export interface ITranslationProvider {
  name: string;
  translate(text: string, targetLang: SupportedTargetLang): Promise<TranslateResult>;
  batchTranslate(texts: string[], targetLang: SupportedTargetLang): Promise<TranslateResult[]>;
}

/**
 * Google Cloud Translation API Provider
 */
class GoogleTranslationProvider implements ITranslationProvider {
  name = 'google';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[i18n] GOOGLE_TRANSLATE_API_KEY not set. Using mock translations.');
    }
  }

  async translate(text: string, targetLang: SupportedTargetLang): Promise<TranslateResult> {
    if (!this.apiKey) return this.mockTranslate(text, targetLang);

    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: this.langMap(targetLang), format: 'text' }),
      });
      const data = await res.json();
      return {
        translatedText: data.data?.translations?.[0]?.translatedText || text,
        sourceLang: 'en',
        targetLang,
      };
    } catch (err) {
      console.error('[i18n] Google Translate failed:', err);
      return this.mockTranslate(text, targetLang);
    }
  }

  async batchTranslate(texts: string[], targetLang: SupportedTargetLang): Promise<TranslateResult[]> {
    return Promise.all(texts.map(t => this.translate(t, targetLang)));
  }

  private langMap(lang: SupportedTargetLang): string {
    const map: Record<string, string> = { es: 'es', hi: 'hi', pt: 'pt', zh: 'zh-CN', fr: 'fr', de: 'de' };
    return map[lang] || lang;
  }

  private mockTranslate(text: string, targetLang: SupportedTargetLang): Promise<TranslateResult> {
    return Promise.resolve({
      translatedText: `[${targetLang}] ${text}`,
      sourceLang: 'en',
      targetLang,
    });
  }
}

/**
 * LibreTranslate Provider (self-hosted / free)
 */
class LibreTranslateProvider implements ITranslationProvider {
  name = 'libre';
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com';
    this.apiKey = process.env.LIBRETRANSLATE_API_KEY || '';
  }

  async translate(text: string, targetLang: SupportedTargetLang): Promise<TranslateResult> {
    try {
      const res = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: targetLang,
          api_key: this.apiKey || undefined,
        }),
      });
      const data = await res.json();
      return {
        translatedText: data.translatedText || text,
        sourceLang: 'en',
        targetLang,
      };
    } catch (err) {
      console.error('[i18n] LibreTranslate failed:', err);
      return { translatedText: text, sourceLang: 'en', targetLang };
    }
  }

  async batchTranslate(texts: string[], targetLang: SupportedTargetLang): Promise<TranslateResult[]> {
    return Promise.all(texts.map(t => this.translate(t, targetLang)));
  }
}

/**
 * DeepL API Provider
 */
class DeepLProvider implements ITranslationProvider {
  name = 'deepl';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.DEEPL_API_KEY || '';
  }

  async translate(text: string, targetLang: SupportedTargetLang): Promise<TranslateResult> {
    if (!this.apiKey) return { translatedText: text, sourceLang: 'en', targetLang };

    try {
      const res = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: [text],
          target_lang: this.langMap(targetLang),
          source_lang: 'EN',
        }),
      });
      const data = await res.json();
      return {
        translatedText: data.translations?.[0]?.text || text,
        sourceLang: 'en',
        targetLang,
      };
    } catch (err) {
      console.error('[i18n] DeepL failed:', err);
      return { translatedText: text, sourceLang: 'en', targetLang };
    }
  }

  async batchTranslate(texts: string[], targetLang: SupportedTargetLang): Promise<TranslateResult[]> {
    return Promise.all(texts.map(t => this.translate(t, targetLang)));
  }

  private langMap(lang: SupportedTargetLang): string {
    const map: Record<string, string> = { es: 'ES', hi: 'HI', pt: 'PT', zh: 'ZH', fr: 'FR', de: 'DE' };
    return map[lang] || lang.toUpperCase();
  }
}

/**
 * OpenAI Provider (using GPT for contextual translations)
 */
class OpenAIProvider implements ITranslationProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_TRANSLATION_MODEL || 'gpt-3.5-turbo';
  }

  async translate(text: string, targetLang: SupportedTargetLang): Promise<TranslateResult> {
    if (!this.apiKey) return { translatedText: text, sourceLang: 'en', targetLang };

    try {
      const langNames: Record<string, string> = {
        es: 'Spanish', hi: 'Hindi', pt: 'Portuguese', zh: 'Chinese', fr: 'French', de: 'German'
      };
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: `Translate the following English text to ${langNames[targetLang]}. Return ONLY the translated text, no explanations.` },
            { role: 'user', content: text },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      return {
        translatedText: data.choices?.[0]?.message?.content?.trim() || text,
        sourceLang: 'en',
        targetLang,
      };
    } catch (err) {
      console.error('[i18n] OpenAI translation failed:', err);
      return { translatedText: text, sourceLang: 'en', targetLang };
    }
  }

  async batchTranslate(texts: string[], targetLang: SupportedTargetLang): Promise<TranslateResult[]> {
    return Promise.all(texts.map(t => this.translate(t, targetLang)));
  }
}

/**
 * Cache helpers
 */
function getCacheKey(text: string, targetLang: string): string {
  return `${CACHE_KEY_PREFIX}${targetLang}:${text}`;
}

export function getCachedTranslation(text: string, targetLang: string): string | null {
  const key = getCacheKey(text, targetLang);
  const cached = translationCache[key]?.[targetLang];
  if (cached) return cached;

  // Try localStorage for persistent cache (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return stored;
    } catch {}
  }
  return null;
}

export function setCachedTranslation(text: string, targetLang: string, translation: string): void {
  const key = getCacheKey(text, targetLang);
  if (!translationCache[key]) translationCache[key] = {};
  translationCache[key][targetLang] = translation;

  // Persist to localStorage (client-side only)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, translation);
    } catch {}
  }
}

/**
 * Factory to get the configured translation provider
 */
export function getTranslationProvider(): ITranslationProvider {
  const provider = (process.env.NEXT_PUBLIC_TRANSLATION_PROVIDER || process.env.TRANSLATION_PROVIDER || 'google') as TranslationProvider;

  switch (provider) {
    case 'deepl':
      return new DeepLProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'libre':
      return new LibreTranslateProvider();
    case 'google':
    default:
      return new GoogleTranslationProvider();
  }
}

/**
 * High-level translate function with caching
 */
export async function translateText(
  text: string,
  targetLang: SupportedTargetLang,
  force = false
): Promise<string> {
  if (!text.trim()) return text;

  // Check cache first (unless forced)
  if (!force) {
    const cached = getCachedTranslation(text, targetLang);
    if (cached) return cached;
  }

  const provider = getTranslationProvider();
  const result = await provider.translate(text, targetLang);
  
  // Cache the result
  setCachedTranslation(text, targetLang, result.translatedText);

  return result.translatedText;
}

/**
 * Batch translate with caching
 */
export async function batchTranslateTexts(
  texts: string[],
  targetLang: SupportedTargetLang
): Promise<Map<string, string>> {
  const resultMap = new Map<string, string>();
  const toTranslate: string[] = [];
  const indices: number[] = [];

  texts.forEach((text, i) => {
    const cached = getCachedTranslation(text, targetLang);
    if (cached) {
      resultMap.set(text, cached);
    } else {
      toTranslate.push(text);
      indices.push(i);
    }
  });

  if (toTranslate.length === 0) return resultMap;

  const provider = getTranslationProvider();
  const results = await provider.batchTranslate(toTranslate, targetLang);

  results.forEach((r, i) => {
    setCachedTranslation(toTranslate[i], targetLang, r.translatedText);
    resultMap.set(toTranslate[i], r.translatedText);
  });

  return resultMap;
}

