/**
 * Translation Engine
 *
 * Orchestrates: extract → translate → write → backup
 * Uses provider abstraction for translation APIs.
 */

import * as fs from 'fs';
import * as path from 'path';
import { scanAllSourceFiles, textToKey, inferPrefix } from './extractor';
import { validateLocaleJSON } from './validator';
import { createBackup } from './backup';

const ROOT = path.resolve(__dirname, '../..');
const LOCALES_DIR = path.join(ROOT, 'src/locales');
const CACHE_FILE = path.join(ROOT, '.translation-cache.json');

export type SupportedLang = 'en' | 'es' | 'hi' | 'pt' | 'zh' | 'fr' | 'de';
export const TARGET_LANGS: SupportedLang[] = ['es', 'hi', 'pt', 'zh', 'fr', 'de'];

// ─── Translation Provider Resolution ──────────────────────────────────
const PROVIDER = (process.env.NEXT_PUBLIC_TRANSLATION_PROVIDER ||
  process.env.TRANSLATION_PROVIDER ||
  'google') as string;

async function translateText(
  text: string,
  targetLang: string
): Promise<string> {
  if (targetLang === 'en') return text;
  if (!text.trim()) return text;

  try {
    // Dynamic import based on provider
    const provider = await import(`../providers/${PROVIDER}`);
    const langCode = provider.langMap(targetLang);
    const translated = await provider.translate(text, langCode);
    return translated || text;
  } catch (err: any) {
    console.warn(`[i18n] Provider "${PROVIDER}" failed: ${err.message}. Falling back to mock.`);
    // Mock translation for development without API keys
    return `[${targetLang}] ${text}`;
  }
}

// ─── Cache ─────────────────────────────────────────────────────────────
interface CacheRecord {
  [text: string]: { [lang: string]: string };
}

function loadCache(): CacheRecord {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveCache(cache: CacheRecord): void {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ─── Dictionary Utils ─────────────────────────────────────────────────
function setNested(obj: any, key: string, value: any): void {
  const parts = key.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function getNested(obj: any, key: string): any {
  return key.split('.').reduce((acc: any, part: string) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return acc[part];
  }, obj);
}

function flatten(obj: any, prefix = ''): { key: string; value: string }[] {
  const results: { key: string; value: string }[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      results.push(...flatten(value, fullKey));
    } else if (typeof value === 'string') {
      results.push({ key: fullKey, value });
    }
  }
  return results;
}

function unflatten(items: { key: string; value: string }[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const { key, value } of items) {
    setNested(result, key, value);
  }
  return result;
}

// ─── Chunk Management ─────────────────────────────────────────────────
function getChunkName(file: string): string {
  // Determine which chunk a file belongs to
  const rel = path.relative(ROOT, file);
  const parts = rel.replace(/\\/g, '/').split('/');

  // pages/xxx → xxx, pages/xxx/yyy → xxx
  // Components/Navbar → common
  // auth/xxx → auth
  // hooks/xxx → common
  if (parts.includes('pages') && parts.includes('index')) return 'common';
  if (parts.includes('Components') || parts.includes('hooks') || parts.includes('lib')) return 'common';
  // Extract page name from pages directory
  const pageIdx = parts.indexOf('pages');
  if (pageIdx >= 0 && parts[pageIdx + 1]) {
    return parts[pageIdx + 1].replace(/\.(tsx|ts)$/, '');
  }
  return 'common';
}

// ─── Main Translation Pipeline ────────────────────────────────────────
export interface TranslateOptions {
  dryRun?: boolean;
  force?: boolean;
  singleLang?: SupportedLang;
  verbose?: boolean;
}

export interface TranslateReport {
  totalExtracted: number;
  newKeys: number;
  translatedCount: number;
  cachedCount: number;
  errors: string[];
  updatedFiles: string[];
  backupPath?: string;
}

export async function runTranslation(
  options: TranslateOptions = {}
): Promise<TranslateReport> {
  const report: TranslateReport = {
    totalExtracted: 0,
    newKeys: 0,
    translatedCount: 0,
    cachedCount: 0,
    errors: [],
    updatedFiles: [],
  };

  // 1. Extract all strings from source
  console.log('📝 Scanning source files...');
  const extracted = await scanAllSourceFiles();
  report.totalExtracted = extracted.length;
  console.log(`   Found ${extracted.length} translatable strings`);

  // 2. Load existing English chunks
  const enChunks: Record<string, Record<string, any>> = {};
  const enDir = path.join(LOCALES_DIR, 'en');
  if (fs.existsSync(enDir)) {
    const files = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(enDir, file), 'utf-8');
      const validation = validateLocaleJSON(content, `en/${file}`);
      if (!validation.valid) {
        report.errors.push(...validation.errors.map(e => e.message));
        continue;
      }
      const chunk = file.replace('.json', '');
      enChunks[chunk] = JSON.parse(content);
    }
  }

  // 3. Group extracted strings by chunk
  const chunked: Record<string, { key: string; value: string; text: string }[]> = {};
  for (const s of extracted) {
    const chunk = getChunkName(s.file);
    if (!chunked[chunk]) chunked[chunk] = [];
    // Check if already exists in any chunk
    const key = s.suggestedKey;
    let exists = false;
    for (const [, dict] of Object.entries(enChunks)) {
      if (getNested(dict, key) !== undefined) { exists = true; break; }
    }
    if (!exists) {
      chunked[chunk].push({ key, value: s.text, text: s.text });
    }
  }

  const newKeys = Object.values(chunked).flat();
  report.newKeys = newKeys.length;

  if (newKeys.length === 0) {
    console.log('✅ No new strings to translate');
    return report;
  }

  // 4. Create backup
  if (!options.dryRun) {
    report.backupPath = createBackup('pre-translate');
    console.log(`💾 Backup created: ${report.backupPath}`);
  }

  // 5. Write English chunks
  if (!options.dryRun) {
    for (const [chunk, items] of Object.entries(chunked)) {
      const dict = enChunks[chunk] || {};
      for (const item of items) {
        setNested(dict, item.key, item.value);
      }
      // Also add any new keys from extraction that don't exist in any chunk
      const chunkFile = path.join(enDir, `${chunk}.json`);
      if (!fs.existsSync(chunkFile)) {
        // Create new chunk
      }
      enChunks[chunk] = dict;
    }
    // Write all English chunks
    for (const [chunk, dict] of Object.entries(enChunks)) {
      const chunkFile = path.join(enDir, `${chunk}.json`);
      const content = JSON.stringify(dict, null, 2) + '\n';
      const validation = validateLocaleJSON(content, `en/${chunk}.json`);
      if (validation.valid) {
        fs.writeFileSync(chunkFile, content);
        report.updatedFiles.push(`en/${chunk}.json`);
      } else {
        for (const err of validation.errors) {
          report.errors.push(`Validation error in en/${chunk}.json: ${err.message}`);
        }
      }
    }
  }

  // 6. Determine target languages
  const targets = options.singleLang
    ? [options.singleLang].filter(l => l !== 'en') as SupportedLang[]
    : TARGET_LANGS;

  console.log(`\n🌍 Translating to ${targets.length} language(s): ${targets.join(', ')}`);

  // 7. Translate for each language
  const cache = loadCache();

  for (const lang of targets) {
    const langDir = path.join(LOCALES_DIR, lang);
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    const langChunks: Record<string, Record<string, any>> = {};

    // Load existing chunks for this language
    if (fs.existsSync(langDir)) {
      const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const chunk = file.replace('.json', '');
        try {
          langChunks[chunk] = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf-8'));
        } catch {}
      }
    }

    let langTranslated = 0;
    let langCached = 0;

    // Process each chunk
    for (const [chunk, items] of Object.entries(chunked)) {
      const existing = langChunks[chunk] || {};

      for (let i = 0; i < items.length; i++) {
        const { key, value } = items[i];
        const existingValue = getNested(existing, key);

        // Skip if already translated and not forced
        if (existingValue !== undefined && !options.force) {
          continue;
        }

        // Check cache
        const cached = cache[value]?.[lang];
        if (cached && !options.force) {
          setNested(existing, key, cached);
          langCached++;
          continue;
        }

        if (options.dryRun) {
          continue;
        }

        if (options.verbose) {
          process.stdout.write(`\r   [${i + 1}/${items.length}] Translating: "${value.substring(0, 40)}..."`);
        }

        try {
          const translated = await translateText(value, lang);

          // Cache it
          if (!cache[value]) cache[value] = {};
          cache[value][lang] = translated;

          setNested(existing, key, translated);
          langTranslated++;
        } catch (err: any) {
          report.errors.push(`Failed to translate "${value}" to ${lang}: ${err.message}`);
          // Fallback to original
          setNested(existing, key, value);
        }

        // Rate limit delay
        await new Promise(r => setTimeout(r, 50));
      }

      langChunks[chunk] = existing;
    }

    // Write locale files for this language
    if (!options.dryRun) {
      for (const [chunk, dict] of Object.entries(langChunks)) {
        const chunkFile = path.join(langDir, `${chunk}.json`);
        // Ensure the chunk directory exists
        const content = JSON.stringify(dict, null, 2) + '\n';
        const validation = validateLocaleJSON(content, `${lang}/${chunk}.json`);
        if (validation.valid) {
          fs.writeFileSync(chunkFile, content);
          report.updatedFiles.push(`${lang}/${chunk}.json`);
        } else {
          for (const err of validation.errors) {
            report.errors.push(`Validation error in ${lang}/${chunk}.json: ${err.message}`);
          }
        }
      }
    }

    if (options.verbose) {
      console.log(`\n   ${lang}: ${langTranslated} translated, ${langCached} from cache`);
    }
    report.translatedCount += langTranslated;
    report.cachedCount += langCached;
  }

  // 8. Save cache
  if (!options.dryRun) {
    saveCache(cache);
  }

  return report;
}

