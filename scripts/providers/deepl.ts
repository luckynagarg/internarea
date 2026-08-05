/**
 * DeepL Translation API Provider
 */
export const name = 'deepl';

export async function translate(
  text: string,
  targetLang: string,
  options?: { apiKey?: string }
): Promise<string> {
  const apiKey = options?.apiKey || process.env.DEEPL_API_KEY;
  if (!apiKey) throw new Error('DEEPL_API_KEY not set');

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `DeepL-Auth-Key ${apiKey}`,
    },
    body: JSON.stringify({ text: [text], target_lang: targetLang.toUpperCase(), source_lang: 'EN' }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepL API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data?.translations?.[0]?.text || text;
}

export function langMap(lang: string): string {
  const map: Record<string, string> = {
    es: 'ES', hi: 'HI', pt: 'PT', zh: 'ZH', fr: 'FR', de: 'DE',
    ja: 'JA', ko: 'KO', ar: 'AR', bn: 'BN', ru: 'RU', it: 'IT',
  };
  return map[lang] || lang.toUpperCase();
}

