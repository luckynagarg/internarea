/**
 * OpenAI Translation API Provider
 */
export const name = 'openai';

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', hi: 'Hindi', pt: 'Portuguese', zh: 'Chinese',
  fr: 'French', de: 'German', ja: 'Japanese', ko: 'Korean',
  ar: 'Arabic', bn: 'Bengali', ru: 'Russian', it: 'Italian',
};

export async function translate(
  text: string,
  targetLang: string,
  options?: { apiKey?: string; model?: string }
): Promise<string> {
  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const model = options?.model || process.env.OPENAI_TRANSLATION_MODEL || 'gpt-3.5-turbo';
  const langName = LANG_NAMES[targetLang] || targetLang;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `Translate the following English text to ${langName}. Return ONLY the translated text, no explanations. Preserve all placeholders like {0}, {name}, {count}. Preserve HTML tags, Markdown formatting, and special characters exactly as they appear.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || text;
}

export function langMap(lang: string): string {
  return lang; // OpenAI uses language names from prompt
}

