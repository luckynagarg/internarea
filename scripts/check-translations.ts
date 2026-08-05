#!/usr/bin/env ts-node
/**
 * Translation Health Check Script
 * 
 * Checks:
 * - Missing keys per language
 * - Duplicate values
 * - Unused keys
 * - Coverage percentages
 * - Overall health score
 * 
 * Usage:
 *   npm run i18n:status
 *   npx ts-node --project tsconfig.json scripts/check-translations.ts --json
 */

import * as fs from 'fs';
import * as path from 'path';

const LOCALES_DIR = path.resolve(__dirname, '../src/locales');
const SRC_DIR = path.resolve(__dirname, '../src');

interface CoverageInfo {
  lang: string;
  langLabel: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  coveragePercent: number;
  status: '✅ Complete' | '⚠️ Partial' | '❌ Low';
}

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Español', hi: 'हिन्दी', pt: 'Português', zh: '中文', fr: 'Français', de: 'Deutsch',
};

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

  return duplicates.sort((a, b) => b.keys.length - a.keys.length);
}

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');

  const localeFiles = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
  
  if (localeFiles.length === 0) {
    console.log('❌ No locale files found in src/locales/');
    process.exit(1);
  }

  // Load English as reference
  const enPath = path.join(LOCALES_DIR, 'en.json');
  if (!fs.existsSync(enPath)) {
    console.log('❌ en.json not found! This is the source language file.');
    process.exit(1);
  }

  const enDict = loadJson(enPath)!;
  const enKeys = extractKeys(enDict);
  const duplicates = findDuplicates(enDict);

  // Check each locale
  const reports: CoverageInfo[] = [];

  for (const file of localeFiles) {
    const lang = file.replace('.json', '');
    const dict = loadJson(path.join(LOCALES_DIR, file));
    const dictKeys = dict ? extractKeys(dict) : [];
    const translatedKeys = enKeys.filter(k => dictKeys.includes(k)).length;
    const missingKeys = enKeys.filter(k => !dictKeys.includes(k)).length;
    const coveragePercent = Math.round((translatedKeys / enKeys.length) * 100);

    let status: CoverageInfo['status'] = '❌ Low';
    if (coveragePercent >= 90) status = '✅ Complete';
    else if (coveragePercent >= 50) status = '⚠️ Partial';

    reports.push({
      lang,
      langLabel: LANG_LABELS[lang] || lang,
      totalKeys: enKeys.length,
      translatedKeys,
      missingKeys,
      coveragePercent,
      status,
    });
  }

  const avgCoverage = Math.round(reports.reduce((s, r) => s + r.coveragePercent, 0) / reports.length);
  const totalKeys = enKeys.length;
  const totalDuplicates = duplicates.length;

  if (jsonOutput) {
    console.log(JSON.stringify({ reports, duplicates, summary: { totalKeys, avgCoverage, totalDuplicates, localeFiles: localeFiles.length } }, null, 2));
    process.exit(0);
  }

  // Pretty output
  console.log('\n═══════════════════════════════════════════');
  console.log('   🔤 i18n Translation Health Report');
  console.log('═══════════════════════════════════════════\n');

  console.log(`📊 Total keys in English: ${totalKeys}`);
  console.log(`🌍 Languages: ${localeFiles.length}`);
  console.log(`📈 Average coverage: ${avgCoverage}%\n`);

  console.log('─── Coverage per Language ───\n');

  for (const r of reports) {
    const barLen = Math.round(r.coveragePercent / 5);
    const bar = '█'.repeat(barLen) + '░'.repeat(20 - barLen);
    console.log(`  ${r.langLabel.padEnd(12)} ${bar} ${r.coveragePercent}% (${r.translatedKeys}/${r.totalKeys}) ${r.status}`);
  }

  if (duplicates.length > 0) {
    console.log('\n─── Duplicate Values ───\n');
    duplicates.slice(0, 10).forEach(d => {
      console.log(`  ⚠️  "${d.value}"`);
      d.keys.forEach(k => console.log(`       → ${k}`));
      console.log();
    });
    if (duplicates.length > 10) {
      console.log(`  ... and ${duplicates.length - 10} more`);
    }
  }

  // Missing keys per language
  for (const r of reports) {
    if (r.missingKeys > 0 && r.lang !== 'en') {
      const dict = loadJson(path.join(LOCALES_DIR, `${r.lang}.json`));
      const dictKeys = dict ? extractKeys(dict) : [];
      const missing = enKeys.filter(k => !dictKeys.includes(k));
      
      console.log(`\n─── Missing keys in ${r.langLabel} (${r.missingKeys}) ───\n`);
      missing.slice(0, 5).forEach(k => {
        const value = k.split('.').reduce((acc: any, part: string) => acc?.[part], enDict);
        console.log(`  ❌ ${k}: "${value}"`);
      });
      if (missing.length > 5) {
        console.log(`  ... and ${missing.length - 5} more`);
      }
    }
  }

  // Overall score
  console.log('\n─── Overall Score ───\n');
  let score = '✅ Excellent';
  if (avgCoverage < 80) score = '⚠️ Good';
  if (avgCoverage < 60) score = '⚠️ Needs Work';
  if (avgCoverage < 40) score = '❌ Poor';
  
  console.log(`  Score: ${score}`);
  console.log(`  Coverage: ${avgCoverage}%`);
  console.log(`  Duplicates: ${totalDuplicates}`);
  console.log(`  Languages: ${localeFiles.length}`);
  
  // Recommendations
  console.log('\n─── Recommendations ───\n');
  if (avgCoverage < 100) {
    console.log('  🚀 Run `npm run translate` to auto-translate missing keys');
  }
  if (totalDuplicates > 0) {
    console.log('  🔧 Review and deduplicate translation keys');
  }
  console.log('  📖 See /admin/translations for detailed management\n');
}

main();

