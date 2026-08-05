/**
 * CLI Entry Point: npm run i18n:sync
 *
 * Synchronizes all locale chunks to match English structure.
 * Adds missing keys, removes orphaned chunks. Never deletes keys.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createBackup, listBackups } from './lib/backup';
import { validateLocaleJSON } from './lib/validator';
import { runTranslation } from './lib/translator';

const LOCALES_DIR = path.resolve(__dirname, '../src/locales');

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

function setNested(obj: any, key: string, value: any): void {
  const parts = key.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔄 i18n Sync\n');

  // 1. Load all English chunks
  const enDir = path.join(LOCALES_DIR, 'en');
  if (!fs.existsSync(enDir)) {
    console.error('❌ No English locale directory found.');
    process.exit(1);
  }

  const enChunks: Record<string, Record<string, any>> = {};
  const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
  for (const file of enFiles) {
    try {
      const chunk = file.replace('.json', '');
      enChunks[chunk] = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf-8'));
    } catch (e: any) {
      console.warn(`   ⚠️  Could not load en/${file}: ${e.message}`);
    }
  }

  console.log(`   English chunks: ${Object.keys(enChunks).join(', ')}`);

  // Flatten English keys
  const enKeys = new Map<string, string>();
  for (const [chunk, dict] of Object.entries(enChunks)) {
    for (const { key, value } of flatten(dict)) {
      enKeys.set(key, value);
    }
  }
  console.log(`   English keys: ${enKeys.size}`);

  // 2. Process each language directory
  const langDirs = fs.readdirSync(LOCALES_DIR).filter(f => {
    const fp = path.join(LOCALES_DIR, f);
    return fs.statSync(fp).isDirectory() && f !== '__backups' && f !== 'en';
  });

  if (!dryRun) {
    createBackup('pre-sync');
    console.log('   Backup created');
  }

  let totalSynced = 0;
  let totalOrphaned = 0;

  for (const langDir of langDirs) {
    const dirPath = path.join(LOCALES_DIR, langDir);
    console.log(`\n   ${langDir}:`);

    // Load existing chunks for this language
    const langChunks: Record<string, Record<string, any>> = {};
    const langFiles = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    for (const file of langFiles) {
      try {
        const chunk = file.replace('.json', '');
        langChunks[chunk] = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));
      } catch {}
    }

    // Flatten existing keys
    const existingKeys = new Set<string>();
    for (const dict of Object.values(langChunks)) {
      for (const { key } of flatten(dict)) {
        existingKeys.add(key);
      }
    }

    // Find missing keys
    const missingKeys: { key: string; value: string; chunk: string }[] = [];
    for (const [key, value] of enKeys) {
      if (!existingKeys.has(key)) {
        // Determine which chunk this key belongs to
        let chunk = 'common';
        for (const [c, dict] of Object.entries(enChunks)) {
          if (flatten(dict).some(f => f.key === key)) {
            chunk = c;
            break;
          }
        }
        missingKeys.push({ key, value, chunk });
      }
    }

    if (missingKeys.length > 0) {
      console.log(`      Missing keys: ${missingKeys.length}`);

      if (!dryRun) {
        // Add missing keys to appropriate chunks
        for (const mk of missingKeys) {
          if (!langChunks[mk.chunk]) langChunks[mk.chunk] = {};
          setNested(langChunks[mk.chunk], mk.key, mk.value); // Use English as fallback
          totalSynced++;
        }

        // Write updated chunks
        for (const [chunk, dict] of Object.entries(langChunks)) {
          const filePath = path.join(dirPath, `${chunk}.json`);
          const content = JSON.stringify(dict, null, 2) + '\n';
          const validation = validateLocaleJSON(content, `${langDir}/${chunk}.json`);
          if (validation.valid) {
            fs.writeFileSync(filePath, content);
          }
        }
      }
    } else {
      console.log('      Up to date');
    }

    // Find orphaned keys (in lang but not in en)
    const orphaned: string[] = [];
    for (const key of existingKeys) {
      if (!enKeys.has(key)) {
        orphaned.push(key);
      }
    }

    if (orphaned.length > 0) {
      console.log(`      Orphaned keys: ${orphaned.length} (not in English, not removed)`);
      totalOrphaned += orphaned.length;
    }
  }

  // 3. Sync new English chunks if needed
  if (!dryRun) {
    const result = await runTranslation({ dryRun: false, verbose: false });
    console.log(`\n   Auto-translated: ${result.translatedCount} new strings`);
  }

  console.log(`\n📊 Sync complete:`);
  console.log(`   Keys synced: ${totalSynced}`);
  console.log(`   Orphaned keys (preserved): ${totalOrphaned}`);

  if (dryRun) {
    console.log('\n⚠️  Dry run. Run without --dry-run to apply.');
  } else {
    console.log('✅ Done');
  }
}

main().catch(console.error);
