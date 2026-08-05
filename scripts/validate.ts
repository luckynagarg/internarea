/**
 * CLI Entry Point: npm run i18n:validate
 *
 * Strict validation of all locale files. Fails on any error.
 */
import { spawnSync } from 'child_process';
import * as path from 'path';

function main() {
  console.log('🔍 Running i18n validation...\n');

  // Delegate to lint script with strict checks
  const result = spawnSync(
    'npx',
    ['ts-node', '--project', 'tsconfig.json', path.resolve(__dirname, 'lint.ts'), '--json'],
    { cwd: path.resolve(__dirname, '..'), stdio: 'pipe', encoding: 'utf-8' }
  );

  if (result.status !== 0) {
    console.log(result.stdout || result.stderr);
    process.exit(1);
  }

  try {
    const report = JSON.parse(result.stdout);
    if (report.totalErrors > 0) {
      console.log(`❌ Validation FAILED: ${report.totalErrors} errors`);
      for (const err of report.errors) {
        if (err.severity === 'error') {
          console.log(`   ❌ [${err.file}] ${err.key || ''} ${err.message}`);
        }
      }
      process.exit(1);
    }
    console.log('✅ All locale files pass validation');
  } catch {
    console.log(result.stdout || result.stderr);
  }
}

main();

