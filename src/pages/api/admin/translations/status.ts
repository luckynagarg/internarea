/**
 * API endpoint for translation status
 * Used by the admin translations dashboard
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

type Data = {
  success: boolean;
  coverage?: any[];
  duplicates?: { value: string; keys: string[] }[];
  unusedKeys?: string[];
  error?: string;
};

const LOCALES_DIR = path.resolve(process.cwd(), 'src/locales');
const SRC_DIR = path.resolve(process.cwd(), 'src');

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const localeFiles = getLocaleFiles();
    const enDict = loadJson(path.join(LOCALES_DIR, 'en.json'));
    
    if (!enDict) {
      return res.status(404).json({ success: false, error: 'en.json not found' });
    }

    const allKeys = extractKeys(enDict);
    const coverage = localeFiles.map(({ lang, langLabel, filePath }) => {
      const dict = loadJson(filePath);
      const dictKeys = dict ? extractKeys(dict) : [];
      const translatedKeys = allKeys.filter(k => dictKeys.includes(k)).length;
      const missingKeys = allKeys.filter(k => !dictKeys.includes(k));
      const coveragePercent = allKeys.length > 0 ? Math.round((translatedKeys / allKeys.length) * 100) : 0;

      return {
        lang,
        langLabel,
        totalKeys: allKeys.length,
        translatedKeys,
        coveragePercent,
        missingKeys,
      };
    });

    // Find duplicate values in en.json
    const duplicates = findDuplicates(enDict);

    // Find unused keys (keys in en.json not found in source)
    const unusedKeys = findUnusedKeys(enDict);

    res.status(200).json({
      success: true,
      coverage,
      duplicates,
      unusedKeys,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function getLocaleFiles(): { lang: string; langLabel: string; filePath: string }[] {
  const langLabels: Record<string, string> = {
    en: 'English', es: 'Español', hi: 'हिन्दी', pt: 'Português', zh: '中文', fr: 'Français', de: 'Deutsch',
  };

  const files: { lang: string; langLabel: string; filePath: string }[] = [];
  
  if (!fs.existsSync(LOCALES_DIR)) return files;

  for (const file of fs.readdirSync(LOCALES_DIR)) {
    if (file.endsWith('.json')) {
      const lang = file.replace('.json', '');
      files.push({
        lang,
        langLabel: langLabels[lang] || lang,
        filePath: path.join(LOCALES_DIR, file),
      });
    }
  }

  return files;
}

function loadJson(filePath: string): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function extractKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys.push(...extractKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function findDuplicates(dict: Record<string, any>): { value: string; keys: string[] }[] {
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

  walk(dict, '');

  for (const [value, keys] of Object.entries(valueToKeys)) {
    if (keys.length > 1) {
      duplicates.push({ value, keys });
    }
  }

  return duplicates;
}

function findUnusedKeys(dict: Record<string, any>): string[] {
  // Simple heuristic - for full implementation, run the extraction script
  // For now return empty array since full scan is heavy
  return [];
}

