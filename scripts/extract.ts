/**
 * CLI Entry Point: npm run i18n:extract
 *
 * Only extracts new English strings, without translating.
 */
import * as fs from 'fs';
import * as path from 'path';
import { scanAllSourceFiles } from './lib/extractor';
import { createBackup } from './lib/backup';

const LOCALES_DIR = path.resolve(__dirname, '../src/locales/en');

async function main() {
  console.log('📝 Scanning source files for new strings...');
  const extracted = await scanAllSourceFiles();
  console.log(`   Found ${extracted.length} translatable strings\n`);

  // Group by chunk
  const byChunk: Record<string, { key: string; value: string; file: string; line: number }[]> = {};

  for (const s of extracted) {
    const chunk = getChunkName(s.file);
    if (!byChunk[chunk]) byChunk[chunk] = [];
    byChunk[chunk].push({ key: s.suggestedKey, value: s.text, file: s.file, line: s.line });
  }

  // Load existing English locale chunks and find new keys
  const existingChunks: Record<string, Set<string>> = {};
  if (fs.existsSync(LOCALES_DIR)) {
    const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const chunk = file.replace('.json', '');
      const keys = new Set<string>();
      const collect = (obj: any, prefix = '') => {
        for (const [k, v] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'object' && v !== null) {
            collect(v, fullKey);
          } else {
            keys.add(fullKey);
          }
        }
      };
      try {
        collect(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf-8')));
      } catch {}
      existingChunks[chunk] = keys;
    }
  }

  // Backup
  createBackup('pre-extract');

  // Find and add new keys
  let newCount = 0;
  for (const [chunk, items] of Object.entries(byChunk)) {
    const existing = existingChunks[chunk] || new Set<string>();
    const newItems = items.filter(i => !existing.has(i.key));

    if (newItems.length === 0) continue;

    // Load or create chunk
    const chunkFile = path.join(LOCALES_DIR, `${chunk}.json`);
    let dict: Record<string, any> = {};
    if (fs.existsSync(chunkFile)) {
      try { dict = JSON.parse(fs.readFileSync(chunkFile, 'utf-8')); } catch {}
    }

    // Add new keys
    const setNested = (obj: any, key: string, value: any) => {
      const parts = key.split('.');
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    };

    for (const item of newItems) {
      setNested(dict, item.key, item.value);
      newCount++;
      console.log(`   [+] ${chunk}.${item.key} = "${item.value.substring(0, 50)}"`);
    }

    // Validate and write
    const content = JSON.stringify(dict, null, 2) + '\n';
    if (!fs.existsSync(path.dirname(chunkFile))) {
      fs.mkdirSync(path.dirname(chunkFile), { recursive: true });
    }
    fs.writeFileSync(chunkFile, content);
  }

  // Generate report
  const report = {
    extractedCount: extracted.length,
    newKeysCount: newCount,
    chunks: Object.keys(byChunk),
    extracted,
  };
  fs.writeFileSync(
    path.resolve(__dirname, '../i18n-extract-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(`\n📊 Summary:`);
  console.log(`   Total strings found: ${extracted.length}`);
  console.log(`   New keys added: ${newCount}`);
  console.log(`   Report: i18n-extract-report.json`);
}

function getChunkName(file: string): string {
  const parts = file.replace(/\\/g, '/').split('/');
  if (parts.includes('Components') || parts.includes('hooks') || parts.includes('lib')) return 'common';
  const pageIdx = parts.indexOf('pages');
  if (pageIdx >= 0 && parts[pageIdx + 1]) {
    return parts[pageIdx + 1].replace(/\.(tsx|ts)$/, '');
  }
  return 'common';
}

main().catch(console.error);

