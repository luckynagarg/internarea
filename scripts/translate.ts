/**
 * CLI Entry Point: npm run translate
 *
 * Extracts new strings + translates all missing keys to all languages.
 */
import { runTranslation } from './lib/translator';

async function main() {
  const args = process.argv.slice(2);
  const report = await runTranslation({
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    singleLang: (args.find(a => a.startsWith('--lang='))?.split('=')[1] || undefined) as any,
    verbose: args.includes('--verbose'),
  });

  console.log('\n📊 Summary:');
  console.log(`   Extracted: ${report.totalExtracted} strings`);
  console.log(`   New keys: ${report.newKeys}`);
  console.log(`   Translated: ${report.translatedCount}`);
  console.log(`   Cached: ${report.cachedCount}`);
  console.log(`   Updated files: ${report.updatedFiles.length}`);

  if (report.errors.length > 0) {
    console.log(`\n⚠️  Errors (${report.errors.length}):`);
    report.errors.slice(0, 5).forEach(e => console.log(`   ${e}`));
  }

  if (args.includes('--dry-run')) {
    console.log('\n⚠️  Dry run completed. Run without --dry-run to apply.');
  } else {
    console.log('\n✅ Done!');
  }
}

main().catch(console.error);

