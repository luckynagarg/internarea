/**
 * CLI Entry Point: npm run i18n:lint
 *
 * Lints all locale JSON files for syntax, structure, and consistency.
 */
import * as fs from 'fs';
import * as path from 'path';
import { validateLocaleJSON } from './lib/validator';

const LOCALES_DIR = path.resolve(__dirname, '../src/locales');

function main() {
  const args = process.argv.slice(2);
  let totalErrors = 0;
  let totalWarnings = 0;
  const errors: { file: string; key: string; message: string; severity: string }[] = [];

  const processDir = (dir: string, prefix: string) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const result = validateLocaleJSON(content, `${prefix}/${file}`);
      for (const err of result.errors) {
        errors.push(err);
        if (err.severity === 'error') totalErrors++;
        else totalWarnings++;
      }
    }
  };

  // Check per-language directories
  const langDirs = fs.readdirSync(LOCALES_DIR).filter(f => {
    const fullPath = path.join(LOCALES_DIR, f);
    return fs.statSync(fullPath).isDirectory() && f !== '__backups';
  });

  for (const langDir of langDirs) {
    processDir(path.join(LOCALES_DIR, langDir), langDir);
  }

  // Also check monolithic files
  const jsonFiles = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json') && f !== '__backups');
  for (const file of jsonFiles) {
    const content = fs.readFileSync(path.join(LOCALES_DIR, file), 'utf-8');
    const result = validateLocaleJSON(content, file);
    for (const err of result.errors) {
      errors.push(err);
      if (err.severity === 'error') totalErrors++;
      else totalWarnings++;
    }
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify({ totalErrors, totalWarnings, errors }, null, 2));
    process.exit(totalErrors > 0 ? 1 : 0);
  }

  console.log('\n🔍 i18n Locale Lint Results\n');

  if (errors.length === 0) {
    console.log('✅ All locale files are valid!\n');
    return;
  }

  for (const err of errors) {
    const icon = err.severity === 'error' ? '❌' : '⚠️';
    console.log(`  ${icon} [${err.file}] ${err.key ? `${err.key}: ` : ''}${err.message}`);
  }

  console.log(`\n📊 ${totalErrors} errors, ${totalWarnings} warnings\n`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();

