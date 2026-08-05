/**
 * Google Cloud Translation API Provider
 */
export const name = 'google';

export async function translate(
  text: string,
  targetLang: string,
  options?: { apiKey?: string }
): Promise<string> {
  const apiKey = options?.apiKey || process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_TRANSLATE_API_KEY not set');

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, target: targetLang, format: 'text' }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Translate API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data?.data?.translations?.[0]?.translatedText || text;
}

export function langMap(lang: string): string {
  const map: Record<string, string> = {
    es: 'es', hi: 'hi', pt: 'pt', zh: 'zh-CN', fr: 'fr', de: 'de',
    ja: 'ja', ko: 'ko', ar: 'ar', bn: 'bn', ru: 'ru', it: 'it',
  };
  return map[lang] || lang;
}

