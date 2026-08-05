/**
 * LibreTranslate API Provider
 */
export const name = 'libre';

export async function translate(
  text: string,
  targetLang: string,
  options?: { apiUrl?: string; apiKey?: string }
): Promise<string> {
  const baseUrl = options?.apiUrl || process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com';
  const apiKey = options?.apiKey || process.env.LIBRETRANSLATE_API_KEY || '';

  const res = await fetch(`${baseUrl}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: 'en',
      target: targetLang,
      api_key: apiKey || undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LibreTranslate API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data?.translatedText || text;
}

export function langMap(lang: string): string {
  return lang; // LibreTranslate uses standard ISO codes
}

