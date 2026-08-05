/**
 * String Extraction Script
 * 
 * Scans src/pages, src/Components, src/app for translatable strings.
 * Extracts from:
 *   - t("...") calls
 *   - <Trans>...</Trans> components  
 *   - Hardcoded text in JSX (limited heuristic)
 *   - placeholder="..."
 *   - title="..."
 *   - aria-label="..."
 *   - toast messages
 *   - validation messages
 * 
 * Usage: npx ts-node --project tsconfig.json scripts/extract-strings.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const SRC_DIR = path.resolve(__dirname, '../src');
const EXTS = ['tsx', 'ts', 'jsx', 'js'];

interface ExtractedString {
  text: string;
  file: string;
  line: number;
  context: string;
  suggestedKey: string;
}

/**
 * Generate a snake_case key from text
 */
function textToKey(text: string, prefix: string): string {
  let key = text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
  
  // Limit length
  if (key.length > 40) {
    key = key.substring(0, 40);
  }
  
  return prefix ? `${prefix}.${key}` : key;
}

/**
 * Infer page prefix from file path
 */
function inferPrefix(filePath: string): string {
  const relative = path.relative(SRC_DIR, filePath);
  const parts = relative.replace(/\\/g, '/').split('/');
  
  // Remove src/pages/ or src/Components/
  if (parts[0] === 'pages') {
    return parts.slice(1).join('_').replace(/\.(tsx|ts|jsx|js)$/, '').replace(/\[.*?\]/g, 'param').replace(/\//g, '_');
  }
  if (parts[0] === 'Components') {
    return parts.slice(1).join('_').replace(/\.(tsx|ts|jsx|js)$/, '').replace(/\//g, '_');
  }
  if (parts[0] === 'auth') {
    return 'auth_' + parts.slice(1).join('_').replace(/\.(tsx|ts|jsx|js)$/, '').replace(/\//g, '_');
  }
  
  return parts.join('_').replace(/\.(tsx|ts|jsx|js)$/, '').replace(/\//g, '_').toLowerCase();
}

/**
 * Extract strings from a file
 */
function extractFromFile(filePath: string): ExtractedString[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: ExtractedString[] = [];
  const prefix = inferPrefix(filePath);

  const patterns: RegExp[] = [
    // t("...") or t('...')
    /t\(\s*["']([^"']+)["']\s*\)/g,
    // t(`...`) template literals
    /t\(\s*`([^`]+)`\s*\)/g,
    // <Trans>...</Trans>
    /<Trans>([^<]+)<\/Trans>/g,
    // placeholder="..."
    /placeholder=["']([^"']+)["']/g,
    // title="..."
    /title=["']([^"']+)["']/g,
    // aria-label="..."
    /aria-label=["']([^"']+)["']/g,
    // toast.success("...")
    /toast\.(success|error|info|warning)\(\s*["']([^"']+)["']/g,
    // toast("...")
    /toast\(\s*["']([^"']+)["']/g,
    // throw new Error("...")
    /new Error\(\s*["']([^"']+)["']/g,
    // label text (simple heuristic for label elements)
    /<label[^>]*>([^<{]+)<\/label>/g,
    // button text (simple heuristic)
    /<button[^>]*>([^<{]+)<\/button>/g,
    // h1-h6 text content
    /<(h[1-6])[^>]*>([^<{]+)<\/\1>/g,
    // span text content
    /<span[^>]*>([^<{]+)<\/span>/g,
    // p text content
    /<p[^>]*>([^<{]+)<\/p>/g,
    // a text content
    /<a[^>]*>([^<{]+)<\/a>/g,
  ];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      const clonedPattern = new RegExp(pattern.source, 'g');
      
      while ((match = clonedPattern.exec(line)) !== null) {
        let text = '';
        
        // Extract the right capture group based on pattern
        if (pattern.source.includes('toast')) {
          text = match[2] || match[1] || '';
        } else if (pattern.source.includes('new Error')) {
          text = match[1] || '';
        } else if (pattern.source.includes('(h[1-6])')) {
          text = match[2] || '';
        } else {
          text = match[1] || '';
        }

        text = text.trim();
        
        // Filter out non-translatable strings
        if (
          text.length < 2 ||
          text.includes('{') ||
          text.includes('}') ||
          text.startsWith('http') ||
          text.startsWith('/') ||
          text.startsWith('#') ||
          /^[0-9\s]+$/.test(text) ||
          text.startsWith('e.g.')
        ) {
          continue;
        }

        // Skip JSX expressions and complex patterns
        if (text.includes('${') || text.includes('<>')) continue;

        const suggestedKey = textToKey(text, prefix);

        results.push({
          text,
          file: path.relative(SRC_DIR, filePath),
          line: lineNum,
          context: line.trim().substring(0, 80),
          suggestedKey,
        });
      }
    }
  });

  return results;
}

/**
 * Main extraction function
 */
async function extractAllStrings(): Promise<ExtractedString[]> {
  const allResults: ExtractedString[] = [];
  const seenTexts = new Set<string>();

  const dirs = [
    path.join(SRC_DIR, 'pages'),
    path.join(SRC_DIR, 'Components'),
    path.join(SRC_DIR, 'auth'),
    path.join(SRC_DIR, 'hooks'),
    path.join(SRC_DIR, 'services'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    for (const ext of EXTS) {
      const files = await glob(`${dir}/**/*.${ext}`);
      
      for (const file of files) {
        // Skip node_modules and .next
        if (file.includes('node_modules') || file.includes('.next')) continue;
        
        const strings = extractFromFile(file);
        
        for (const s of strings) {
          // Deduplicate
          const key = `${s.text}|${s.suggestedKey}`;
          if (!seenTexts.has(key)) {
            seenTexts.add(key);
            allResults.push(s);
          }
        }
      }
    }
  }

  return allResults;
}

/**
 * Build a nested dictionary object from flattened extracted strings
 */
function buildDictionary(strings: ExtractedString[]): Record<string, any> {
  const dict: Record<string, any> = {};

  for (const s of strings) {
    const parts = s.suggestedKey.split('.');
    let current = dict;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    const lastKey = parts[parts.length - 1];
    if (!current[lastKey]) {
      current[lastKey] = s.text;
    }
  }

  return dict;
}

/**
 * Compare with existing dictionary and find only new/missing keys
 */
function findMissingKeys(
  extracted: Record<string, any>,
  existing: Record<string, any>,
  prefix = ''
): { key: string; value: string }[] {
  const missing: { key: string; value: string }[] = [];

  for (const [key, value] of Object.entries(extracted)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null) {
      missing.push(...findMissingKeys(value, existing[key] || {}, fullKey));
    } else if (typeof value === 'string') {
      const existingValue = getNestedValue(existing, fullKey);
      if (existingValue === undefined) {
        missing.push({ key: fullKey, value });
      }
    }
  }

  return missing;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);
}

function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

// Run if called directly
if (require.main === module) {
  (async () => {
    console.log('[i18n-extract] Scanning source files...');
    const strings = await extractAllStrings();
    
    console.log(`[i18n-extract] Found ${strings.length} translatable strings.`);
    
    // Load existing en.json
    const localePath = path.resolve(__dirname, '../src/locales/en.json');
    let existingDict: Record<string, any> = {};
    if (fs.existsSync(localePath)) {
      existingDict = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
    }

    const newDict = buildDictionary(strings);
    const missing = findMissingKeys(newDict, existingDict);
    
    if (missing.length === 0) {
      console.log('[i18n-extract] No new strings found. Dictionary is up to date.');
      process.exit(0);
    }

    console.log(`[i18n-extract] ${missing.length} new string(s) to add:`);
    missing.forEach(m => console.log(`  - ${m.key}: "${m.value}"`));

    // Merge into existing dictionary
    for (const m of missing) {
      setNestedValue(existingDict, m.key, m.value);
    }

    // Write updated en.json
    fs.writeFileSync(localePath, JSON.stringify(existingDict, null, 2) + '\n');
    console.log(`[i18n-extract] Updated ${localePath}`);

    // Generate report
    const reportPath = path.resolve(__dirname, '../i18n-extract-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      totalFound: strings.length,
      newKeys: missing.length,
      timestamp: new Date().toISOString(),
      newStrings: missing,
      allStrings: strings,
    }, null, 2));
    console.log(`[i18n-extract] Report saved to ${reportPath}`);
  })();
}

