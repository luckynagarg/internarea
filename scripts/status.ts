/**
 * CLI Entry Point: npm run i18n:status
 *
 * Shows translation health: coverage, duplicates, missing keys.
 */
import { generateCoverageReport, printCoverageReport } from './lib/coverage';

function main() {
  const args = process.argv.slice(2);
  const report = generateCoverageReport();

  if (args.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printCoverageReport(report);
  }

  // Exit non-zero if any language has < 100% coverage
  const incomplete = report.languages.filter(l => l.coveragePercent < 100);
  if (incomplete.length > 0 && !args.includes('--json')) {
    console.log(`\n⚠️  ${incomplete.length} language(s) have incomplete translations.`);
    console.log('   Run `npm run translate` to fill missing keys.');
  }
}

main();

