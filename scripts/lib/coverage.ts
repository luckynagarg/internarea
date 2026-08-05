/**
 * Translation Coverage Report
 *
 * Analyzes all locale files and generates coverage metrics.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const LOCALES_DIR = path.join(ROOT, 'src/locales');
const SRC_DIR = path.join(ROOT, 'src');

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Español', hi: 'हिन्दी', pt: 'Português',
  zh: '中文', fr: 'Français', de: 'Deutsch',
};

export interface CoveragePerLang {
  lang: string;
  langLabel: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  coveragePercent: number;
  chunks: string[];
}

export interface CoverageReport {
  languages: CoveragePerLang[];
  totalKeys: number;
  avgCoverage: number;
  duplicates: { value: string; keys: string[] }[];
  unusedKeys: string[];
  totalChunks: number;
}

function flattenKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

export function generateCoverageReport(): CoverageReport {
  // Load all English chunks as reference
  const enDir = path.join(LOCALES_DIR, 'en');
  const enChunks: Record<string, Record<string, any>> = {};

  if (fs.existsSync(enDir)) {
    const files = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const chunk = file.replace('.json', '');
        enChunks[chunk] = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf-8'));
      } catch {}
    }
  }

  const enKeys = new Set<string>();
  for (const dict of Object.values(enChunks)) {
    for (const key of flattenKeys(dict)) {
      enKeys.add(key);
    }
  }

  const totalKeys = enKeys.size;

  // Scan all language directories
  const languages: CoveragePerLang[] = [];
  let totalCoverage = 0;

  const langDirs = fs.readdirSync(LOCALES_DIR).filter(f => {
    const fullPath = path.join(LOCALES_DIR, f);
    return fs.statSync(fullPath).isDirectory() && f !== '__backups';
  });

  for (const langDir of langDirs) {
    const dirPath = path.join(LOCALES_DIR, langDir);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const langKeys = new Set<string>();
    const chunks: string[] = [];

    for (const file of files) {
      try {
        const chunk = file.replace('.json', '');
        chunks.push(chunk);
        const dict = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));
        for (const key of flattenKeys(dict)) {
          langKeys.add(key);
        }
      } catch {}
    }

    const translated = [...enKeys].filter(k => langKeys.has(k)).length;
    const missing = totalKeys - translated;
    const coverage = totalKeys > 0 ? Math.round((translated / totalKeys) * 100) : 0;
    totalCoverage += coverage;

    languages.push({
      lang: langDir,
      langLabel: LANG_LABELS[langDir] || langDir,
      totalKeys,
      translatedKeys: translated,
      missingKeys: missing,
      coveragePercent: coverage,
      chunks,
    });
  }

  // Find duplicates
  const duplicates = findDuplicates(enChunks);

  // Find unused keys (heuristic - keys in en chunks not found in any source)
  const unusedKeys: string[] = [];

  return {
    languages: languages.sort((a, b) => b.coveragePercent - a.coveragePercent),
    totalKeys,
    avgCoverage: languages.length > 0 ? Math.round(totalCoverage / languages.length) : 0,
    duplicates,
    unusedKeys,
    totalChunks: Object.keys(enChunks).length,
  };
}

function findDuplicates(
  chunks: Record<string, Record<string, any>>
): { value: string; keys: string[] }[] {
  const valueToKeys: Record<string, string[]> = {};

  for (const [chunk, dict] of Object.entries(chunks)) {
    const collect = (obj: any, prefix: string) => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : `${chunk}.${key}`;
        if (typeof value === 'object' && value !== null) {
          collect(value, fullKey);
        } else if (typeof value === 'string') {
          if (!valueToKeys[value]) valueToKeys[value] = [];
          if (!valueToKeys[value].includes(fullKey)) {
            valueToKeys[value].push(fullKey);
          }
        }
      }
    };
    collect(dict, '');
  }

  return Object.entries(valueToKeys)
    .filter(([, keys]) => keys.length > 1)
    .map(([value, keys]) => ({ value, keys }))
    .sort((a, b) => b.keys.length - a.keys.length);
}

export function printCoverageReport(report: CoverageReport): void {
  console.log('\n═══════════════════════════════════════════');
  console.log('   📊 i18n Translation Coverage Report');
  console.log('═══════════════════════════════════════════\n');

  console.log(`📈 Total Keys: ${report.totalKeys}`);
  console.log(`🗂️  Chunks: ${report.totalChunks}`);
  console.log(`🌍 Languages: ${report.languages.length}`);
  console.log(`📊 Average Coverage: ${report.avgCoverage}%\n`);

  console.log('─── Per Language ───\n');

  for (const lang of report.languages) {
    const barLen = Math.round(lang.coveragePercent / 5);
    const bar = '█'.repeat(barLen) + '░'.repeat(20 - barLen);
    const status = lang.coveragePercent >= 90 ? '✅' : lang.coveragePercent >= 50 ? '⚠️' : '❌';
    console.log(
      `  ${lang.langLabel.padEnd(12)} ${bar} ${lang.coveragePercent}% ` +
      `(${lang.translatedKeys}/${lang.totalKeys}) ${status}`
    );
  }

  if (report.duplicates.length > 0) {
    console.log('\n─── Duplicates ───\n');
    report.duplicates.slice(0, 5).forEach(d => {
      console.log(`  ⚠️  "${d.value}" → ${d.keys.length} keys`);
      d.keys.slice(0, 3).forEach(k => console.log(`       ${k}`));
      if (d.keys.length > 3) console.log(`       ... and ${d.keys.length - 3} more`);
    });
  }

  console.log('\n─── Summary ───\n');
  console.log(`  ${report.languages.filter(l => l.coveragePercent >= 100).length}/${report.languages.length} languages complete`);
  console.log(`  ${report.totalChunks} locale chunks`);
  console.log(`  ${report.duplicates.length} duplicate values`);
}

