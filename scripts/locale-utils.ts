/**
 * Locale Utilities
 * 
 * Shared utilities used by extract-strings.ts and generate-locales.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const SRC_DIR = path.resolve(__dirname, '../src');

export interface ExtractedString {
  text: string;
  file: string;
  line: number;
  context: string;
  suggestedKey: string;
}

/**
 * Generate a snake_case key from text with prefix
 */
export function textToKey(text: string, prefix: string): string {
  let key = text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
  
  if (key.length > 50) {
    key = key.substring(0, 50).replace(/_+$/, '');
  }
  
  return prefix ? `${prefix}.${key}` : key;
}

/**
 * Infer page prefix from file path relative to src/
 */
export function inferPrefix(filePath: string): string {
  const relative = path.relative(SRC_DIR, filePath);
  const parts = relative.replace(/\\/g, '/').split('/');
  
  if (parts[0] === 'pages') {
    const name = parts.slice(1).join('_')
      .replace(/\.(tsx|ts|jsx|js)$/, '')
      .replace(/\[.*?\]/g, 'param')
      .replace(/\//g, '_');
    return name || 'home';
  }
  if (parts[0] === 'Components') {
    return parts.slice(1).join('_')
      .replace(/\.(tsx|ts|jsx|js)$/, '')
      .replace(/\//g, '_')
      .toLowerCase();
  }
  if (parts[0] === 'auth') {
    return 'auth_' + parts.slice(1).join('_')
      .replace(/\.(tsx|ts|jsx|js)$/, '')
      .replace(/\//g, '_')
      .toLowerCase();
  }
  
  return parts.join('_')
    .replace(/\.(tsx|ts|jsx|js)$/, '')
    .replace(/\//g, '_')
    .toLowerCase();
}

/**
 * Extract translatable strings from a file
 */
export function extractFromFile(filePath: string): ExtractedString[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: ExtractedString[] = [];
  const prefix = inferPrefix(filePath);
  const seen = new Set<string>();

  const patterns: { regex: RegExp; group: number }[] = [
    { regex: /t\(\s*["']([^"']+)["']\s*\)/g, group: 1 },
    { regex: /<Trans>([^<]+)<\/Trans>/g, group: 1 },
    { regex: /placeholder=["']([^"']{3,})["']/g, group: 1 },
    { regex: /title=["']([^"']{3,})["']/g, group: 1 },
    { regex: /aria-label=["']([^"']{3,})["']/g, group: 1 },
    { regex: /toast\.\w+\(\s*["']([^"']+)["']/g, group: 1 },
    { regex: /<label[^>]*>([^<{]{3,})<\/label>/g, group: 1 },
    { regex: /<(h[1-6])[^>]*>([^<{]{3,})<\/\1>/g, group: 2 },
    { regex: /<button[^>]*>([^<{]{3,})<\/button>/g, group: 1 },
    { regex: /<span[^>]*>([^<{]{3,})<\/span>/g, group: 1 },
    { regex: /<p[^>]*>([^<{]{3,})<\/p>/g, group: 1 },
    { regex: /<a[^>]*>([^<{]{3,})<\/a>/g, group: 1 },
  ];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    for (const { regex, group } of patterns) {
      const cloned = new RegExp(regex.source, 'g');
      let match: RegExpExecArray | null;

      while ((match = cloned.exec(line)) !== null) {
        const text = (match[group] || '').trim();
        if (!isTranslatable(text)) continue;

        const suggestedKey = textToKey(text, prefix);
        const dedupKey = `${suggestedKey}:${text}`;
        
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          results.push({
            text,
            file: path.relative(SRC_DIR, filePath),
            line: lineNum,
            context: line.trim().substring(0, 80),
            suggestedKey,
          });
        }
      }
    }
  });

  return results;
}

/**
 * Check if text is worth translating
 */
function isTranslatable(text: string): boolean {
  if (text.length < 3) return false;
  if (/^[0-9\s\-.,%₹$€]+$/.test(text)) return false;
  if (text.startsWith('http') || text.startsWith('/') || text.startsWith('#')) return false;
  if (text.startsWith('e.g.') || text.startsWith('i.e.')) return false;
  if (text.includes('{') && text.includes('}') && !text.includes(' ')) return false;
  if (/^[A-Z\s]+$/.test(text) && text.split(' ').length <= 2) return true; // Allow SHORT TEXT
  return true;
}

/**
 * Main extraction function
 */
export async function extractAllStrings(): Promise<ExtractedString[]> {
  const allResults: ExtractedString[] = [];
  const seen = new Set<string>();

  const dirs = [
    path.join(SRC_DIR, 'pages'),
    path.join(SRC_DIR, 'Components'),
    path.join(SRC_DIR, 'auth'),
    path.join(SRC_DIR, 'hooks'),
  ];

  const exts = ['tsx', 'ts', 'jsx', 'js'];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    for (const ext of exts) {
      const files = await glob(`${dir}/**/*.${ext}`);
      
      for (const file of files) {
        if (file.includes('node_modules') || file.includes('.next')) continue;
        
        const strings = extractFromFile(file);
        
        for (const s of strings) {
          const dedupKey = `${s.suggestedKey}:${s.text}`;
          if (!seen.has(dedupKey)) {
            seen.add(dedupKey);
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
export function buildDictionary(strings: ExtractedString[]): Record<string, any> {
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
 * Find keys in 'extracted' that are missing from 'existing'
 */
export function findMissingKeys(
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

/**
 * Get nested value from object by dot path
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);
}

/**
 * Set nested value in object by dot path
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Check for duplicate values in a dictionary (same value under different keys)
 */
export function findDuplicates(dict: Record<string, any>, prefix = ''): { value: string; keys: string[] }[] {
  const valueToKeys: Record<string, string[]> = {};
  const duplicates: { value: string; keys: string[] }[] = [];

  function walk(obj: any, path: string) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = path ? `${path}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        walk(value, fullKey);
      } else if (typeof value === 'string') {
        if (!valueToKeys[value]) valueToKeys[value] = [];
        valueToKeys[value].push(fullKey);
      }
    }
  }

  walk(dict, prefix);

  for (const [value, keys] of Object.entries(valueToKeys)) {
    if (keys.length > 1) {
      duplicates.push({ value, keys });
    }
  }

  return duplicates;
}

/**
 * Find unused keys (keys in dictionary but not found in source)
 */
export async function findUnusedKeys(dict: Record<string, any>): Promise<string[]> {
  const allKeys: string[] = [];
  
  function collectKeys(obj: any, prefix: string) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        collectKeys(value, fullKey);
      } else {
        allKeys.push(fullKey);
      }
    }
  }
  
  collectKeys(dict, '');

  // Extract all t("...") usages from source
  const strings = await extractAllStrings();
  const usedKeys = new Set(strings.map(s => s.suggestedKey));

  return allKeys.filter(k => !usedKeys.has(k));
}

/**
 * Calculate translation coverage percentage
 */
export function calculateCoverage(enDict: Record<string, any>, langDict: Record<string, any>): number {
  const enKeys: string[] = [];
  const langKeys: string[] = [];

  function collectKeys(obj: any, prefix: string, target: string[]) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        collectKeys(value, fullKey, target);
      } else {
        target.push(fullKey);
      }
    }
  }

  collectKeys(enDict, '', enKeys);
  collectKeys(langDict, '', langKeys);

  const langKeySet = new Set(langKeys);
  const translated = enKeys.filter(k => langKeySet.has(k)).length;
  
  return enKeys.length > 0 ? Math.round((translated / enKeys.length) * 100) : 0;
}

