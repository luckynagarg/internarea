#!/usr/bin/env ts-node
/**
 * Auto Translation CLI Generator
 * 
 * Scans source files for new English strings, translates them to all target languages,
 * and updates locale files. Never overwrites existing manual translations.
 * 
 * Usage:
 *   npm run translate                 # Extract + translate all missing keys
 *   npm run translate -- --dry-run    # Show what would be translated
 *   npm run translate -- --lang=hi    # Only translate to Hindi
 *   npm run translate -- --force      # Re-translate all strings (overwrite cache)
 * 
 * Config via environment variables:
 *   NEXT_PUBLIC_TRANSLATION_PROVIDER  # google | deepl | openai | libre
 *   GOOGLE_TRANSLATE_API_KEY
 *   DEEPL_API_KEY
 *   OPENAI_API_KEY
 *   LIBRETRANSLATE_URL
 *   LIBRETRANSLATE_API_KEY
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractAllStrings, findMissingKeys, buildDictionary, setNestedValue, getNestedValue } from './locale-utils';

// --- Types ---
type SupportedLang = 'en' | 'es' | 'hi' | 'pt' | 'zh' | 'fr' | 'de';

const TARGET_LANGS: SupportedLang[] = ['es', 'hi', 'pt', 'zh', 'fr', 'de'];
const LOCALES_DIR = path.resolve(__dirname, '../src/locales');
const TS_DICTIONARIES_DIR = path.resolve(__dirname, '../src/i18n/dictionaries');

// --- CLI Args ---
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    singleLang: args.find(a => a.startsWith('--lang='))?.split('=')[1] as SupportedLang | undefined,
    verbose: args.includes('--verbose'),
  };
}

// --- Translation Provider (inlined for CLI) ---
interface TranslationResult {
  translatedText: string;
  targetLang: string;
}

// Language names for OpenAI prompts
const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', hi: 'Hindi', pt: 'Portuguese', zh: 'Chinese', fr: 'French', de: 'German'
};

const TRANSLATION_PROVIDER = process.env.NEXT_PUBLIC_TRANSLATION_PROVIDER || process.env.TRANSLATION_PROVIDER || 'google';

async function translateText(text: string, targetLang: SupportedLang): Promise<string> {
  if (targetLang === 'en') return text;
  if (!text.trim()) return text;

  try {
    switch (TRANSLATION_PROVIDER) {
      case 'deepl':
        return await translateDeepL(text, targetLang);
      case 'openai':
        return await translateOpenAI(text, targetLang);
      case 'libre':
        return await translateLibre(text, targetLang);
      case 'google':
      default:
        return await translateGoogle(text, targetLang);
    }
  } catch (err) {
    console.error(`[i18n] Failed to translate "${text}" to ${targetLang}:`, err);
    return text; // Fallback to English
  }
}

async function translateGoogle(text: string, targetLang: SupportedLang): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return `[${targetLang}] ${text}`; // Mock

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, target: langMapGoogle(targetLang), format: 'text' }),
  });
  const data = await res.json();
  return data.data?.translations?.[0]?.translatedText || text;
}

function langMapGoogle(lang: SupportedLang): string {
  const map: Record<string, string> = { es: 'es', hi: 'hi', pt: 'pt', zh: 'zh-CN', fr: 'fr', de: 'de' };
  return map[lang] || lang;
}

async function translateDeepL(text: string, targetLang: SupportedLang): Promise<string> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return text;

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `DeepL-Auth-Key ${apiKey}` },
    body: JSON.stringify({ text: [text], target_lang: targetLang.toUpperCase(), source_lang: 'EN' }),
  });
  const data = await res.json();
  return data.translations?.[0]?.text || text;
}

async function translateOpenAI(text: string, targetLang: SupportedLang): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return text;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_TRANSLATION_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: `Translate the following English text to ${LANG_NAMES[targetLang]}. Return ONLY the translated text, no explanations. Keep placeholders like {0}, {name} intact.` },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}

async function translateLibre(text: string, targetLang: SupportedLang): Promise<string> {
  const baseUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com';
  const apiKey = process.env.LIBRETRANSLATE_API_KEY || '';

  const res = await fetch(`${baseUrl}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'en', target: targetLang, api_key: apiKey || undefined }),
  });
  const data = await res.json();
  return data.translatedText || text;
}

// --- Cache ---
const TRANSLATION_CACHE_FILE = path.resolve(__dirname, '../.translation-cache.json');

function loadCache(): Record<string, Record<string, string>> {
  try {
    if (fs.existsSync(TRANSLATION_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(TRANSLATION_CACHE_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveCache(cache: Record<string, Record<string, string>>): void {
  fs.writeFileSync(TRANSLATION_CACHE_FILE, JSON.stringify(cache, null, 2));
}

// --- Main ---
async function main() {
  const args = parseArgs();
  console.log(`\n🔤 InternArea Translation CLI`);
  console.log(`   Provider: ${TRANSLATION_PROVIDER}`);
  console.log(`   Dry run: ${args.dryRun}`);
  console.log(`   Force: ${args.force}\n`);

  // 1. Extract strings from source
  console.log('📝 Step 1: Scanning source files...');
  const extractedStrings = await extractAllStrings();
  console.log(`   Found ${extractedStrings.length} translatable strings.`);

  // 2. Build English dictionary
  const newDict = buildDictionary(extractedStrings);

  // 3. Load existing en.json
  const enLocalePath = path.join(LOCALES_DIR, 'en.json');
  let enDict: Record<string, any> = {};
  if (fs.existsSync(enLocalePath)) {
    enDict = JSON.parse(fs.readFileSync(enLocalePath, 'utf-8'));
  }

  // 4. Find missing keys
  const missing = findMissingKeys(newDict, enDict);
  
  if (missing.length === 0) {
    console.log('✅ Step 2: English dictionary is up to date. No new strings.');
  } else {
    console.log(`📦 Step 2: Adding ${missing.length} new string(s) to English dictionary.`);
    
    if (!args.dryRun) {
      for (const m of missing) {
        setNestedValue(enDict, m.key, m.value);
      }
      fs.writeFileSync(enLocalePath, JSON.stringify(enDict, null, 2) + '\n');
      console.log(`   Updated ${enLocalePath}`);
    }
  }

  // 5. Determine which languages to translate
  const langsToTranslate = args.singleLang 
    ? [args.singleLang].filter(l => l !== 'en') as SupportedLang[]
    : TARGET_LANGS;

  console.log(`\n🌍 Step 3: Translating to ${langsToTranslate.length} language(s): ${langsToTranslate.join(', ')}`);

  // Load translation cache
  const cache = loadCache();
  let totalTranslated = 0;
  let totalFromCache = 0;

  for (const lang of langsToTranslate) {
    const localePath = path.join(LOCALES_DIR, `${lang}.json`);
    let langDict: Record<string, any> = {};
    
    // Load existing locale
    if (fs.existsSync(localePath)) {
      langDict = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
    }

    // Find untranslated keys
    const untranslated: { key: string; value: string }[] = [];
    
    for (const m of missing) {
      const existingValue = getNestedValue(langDict, m.key);
      if (existingValue === undefined || args.force) {
        untranslated.push(m);
      }
    }

    // Also check en.json for existing keys not yet in target language
    const allEnKeys: { key: string; value: string }[] = [];
    collectAllKeys(enDict, allEnKeys, '');
    
    for (const { key, value } of allEnKeys) {
      const existingValue = getNestedValue(langDict, key);
      if (existingValue === undefined && !untranslated.find(u => u.key === key)) {
        untranslated.push({ key, value });
      }
    }

    if (untranslated.length === 0) {
      console.log(`   ${lang}: ✅ Up to date (0 strings to translate)`);
      continue;
    }

    console.log(`   ${lang}: ${untranslated.length} string(s) to translate...`);

    if (args.dryRun) {
      untranslated.slice(0, 5).forEach(u => {
        console.log(`     - [${u.key}] "${u.value}"`);
      });
      if (untranslated.length > 5) {
        console.log(`     ... and ${untranslated.length - 5} more`);
      }
      continue;
    }

    // Translate each missing key
    let langTranslated = 0;
    let langCached = 0;

    for (let i = 0; i < untranslated.length; i++) {
      const { key, value } = untranslated[i];

      // Check cache
      const cached = cache[value]?.[lang];
      if (cached && !args.force) {
        setNestedValue(langDict, key, cached);
        langCached++;
        totalFromCache++;
        continue;
      }

      process.stdout.write(`\r     [${i + 1}/${untranslated.length}] Translating: "${value.substring(0, 40)}..."`);
      
      const translated = await translateText(value, lang);
      
      // Save to cache
      if (!cache[value]) cache[value] = {};
      cache[value][lang] = translated;
      
      setNestedValue(langDict, key, translated);
      langTranslated++;
      totalTranslated++;

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    // Write locale file
    fs.writeFileSync(localePath, JSON.stringify(langDict, null, 2) + '\n');
    
    // Also update TypeScript dictionary
    updateTsDictionary(lang, langDict);

    console.log(`\r     ✅ ${lang}: ${langTranslated} translated, ${langCached} from cache.`);
  }

  // Save cache
  if (!args.dryRun) {
    saveCache(cache);
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total English strings: ${allKeysCount(enDict)}`);
  console.log(`   New strings found: ${missing.length}`);
  console.log(`   Translated: ${totalTranslated}`);
  console.log(`   From cache: ${totalFromCache}`);
  
  if (args.dryRun) {
    console.log('\n⚠️  Dry run completed. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ All locale files updated successfully!');
    
    // Update package.json scripts if needed
    console.log('\n💡 Next steps:');
    console.log('   1. Review the generated translations');
    console.log('   2. Run `npm run translate` again to translate new strings');
    console.log('   3. Use `t("key")` in your components');
  }
}

function collectAllKeys(obj: any, results: { key: string; value: string }[], prefix: string) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      collectAllKeys(value, results, fullKey);
    } else if (typeof value === 'string') {
      results.push({ key: fullKey, value });
    }
  }
}

function allKeysCount(obj: any): number {
  let count = 0;
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      count += allKeysCount(value);
    } else if (typeof value === 'string') {
      count++;
    }
  }
  return count;
}

function updateTsDictionary(lang: SupportedLang, dict: Record<string, any>): void {
  if (lang === 'en') return; // English TS dictionary is manually maintained

  const tsPath = path.join(TS_DICTIONARIES_DIR, `${lang}.ts`);
  
  // Convert JSON to TS export
  const tsContent = generateTsContent(lang, dict);
  
  if (!fs.existsSync(tsPath)) {
    fs.writeFileSync(tsPath, tsContent);
    console.log(`   Created TypeScript dictionary: ${tsPath}`);
  }
}

function generateTsContent(lang: SupportedLang, dict: Record<string, any>): string {
  const jsonStr = JSON.stringify(dict, null, 2);
  return `const dict = ${jsonStr} as const;\n\nexport default dict;\n`;
}

main().catch(console.error);

