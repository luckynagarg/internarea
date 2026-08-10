import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..'); // internarea/
const targetDirs = [repoRoot];

const LEGACY_FIREBASE_PATHS = [
  'src/firebase/',
  'Firebase/',
  'src/firebase/firebase.js',
  'src/firebase/storage.js',
  'src/firebase/uploadMedia.js',
  'src/firebase/',
  'src/Firebase/',
  'Firebase/firebase.tsx',
];

const LEGACY_OTP_PATHS = [
  'src/Components/OtpLogin.tsx',
  'Components/OtpLogin',
  'src/Components/OtpLogin',
  'Components/OtpLogin.tsx',
];

const CENTRAL_FIREBASE_ENTRY = 'src/lib/firebase';
const CENTRAL_PHONE_OTP_ENTRY = 'src/auth/PhoneOtpLogin';

function isTextFile(fp) {
  const ext = path.extname(fp).toLowerCase();
  return ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css'].includes(ext);
}

function walk(dir, out = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) {
    if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === 'dist' || ent.name === 'build') continue;
    walk(fp, out);
    } else {
        if (isTextFile(fp)) out.push(fp);
    }
    }
return out;
}

function readFileSafe(fp) {
  try {
    return fs.readFileSync(fp, 'utf8');
  } catch {
    return '';
  }
}

function normalize(s) {
  return s.replace(/\\/g, '/');
}

function scanContentForPatterns(content, patterns) {
  const found = [];
  for (const p of patterns) {
    if (content.includes(p)) found.push(p);
  }
  return found;
}

const files = targetDirs.flatMap((d) => walk(d));

const results = {
  firebaseImports: [],
  otpComponentImports: [],
  duplicateFirebaseInitializationCandidates: [],
  legacyFirebaseReferences: [],
  legacyOtpReferences: [],
  brokenImportPathsCandidates: [],
  filesScanned: files.length,
};

const importRegex = /from\s+['"]([^'"]+)['"]/g;
const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

function checkBrokenImport(fromPath, candidateImport, absFile) {
  // best-effort: only check relative imports
  if (!candidateImport.startsWith('.') && !candidateImport.startsWith('/')) return;
  const base = path.dirname(fromPath);
  let resolved = path.resolve(base, candidateImport);

  // try common extensions
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];
  for (const ext of exts) {
    const fp = resolved + ext;
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return;
  }

  // directory index
  const idxCandidates = ['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'index.json'];
  for (const idx of idxCandidates) {
    const fp = path.join(resolved, idx);
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return;
  }

  results.brokenImportPathsCandidates.push({
    absFile,
    candidateImport,
  });
}

for (const fp of files) {
  const absFile = fp;
  const content = readFileSafe(fp);
  const norm = normalize(content);

  // collect imports
  const importMatches = [...content.matchAll(importRegex)].map((m) => m[1]);
  const requireMatches = [...content.matchAll(requireRegex)].map((m) => m[1]);
  const allImports = [...importMatches, ...requireMatches];

  for (const imp of allImports) {
    const normImp = normalize(imp);

    if (normImp.includes('firebase')) {
      results.firebaseImports.push({ absFile, imp: normImp });
    }

    if (normImp.includes('OtpLogin') || normImp.includes('PhoneOtpLogin')) {
      results.otpComponentImports.push({ absFile, imp: normImp });
    }

    // check legacy refs
    for (const legacy of LEGACY_FIREBASE_PATHS) {
      if (normImp.includes(legacy) || normImp.includes(legacy.replace('src/', ''))) {
        results.legacyFirebaseReferences.push({ absFile, imp: normImp, legacy });
      }
    }
    for (const legacyOtp of LEGACY_OTP_PATHS) {
      if (normImp.includes(legacyOtp) || normImp.includes('OtpLogin')) {
        // only flag OTP legacy if it is specifically OtpLogin component path usage
        if (normImp.toLowerCase().includes('otp') && normImp.toLowerCase().includes('login')) {
          results.legacyOtpReferences.push({ absFile, imp: normImp, legacyOtp });
        }
      }
    }

    checkBrokenImport(fp, imp, absFile);
  }

  // duplicate init candidates (best-effort)
  if (norm.includes('initializeApp(') || (norm.includes('getApps().length') && norm.includes('initializeApp'))) {
    // Only consider files outside the centralized module
    const centralized = normalize(fp).includes(normalize(path.join('src', 'lib', 'firebase.ts')));
    if (!centralized) {
      results.duplicateFirebaseInitializationCandidates.push(fp);
    }
  }

  // RecaptchaVerifier duplication
  if (norm.includes('RecaptchaVerifier') && !normalize(fp).includes(normalize(CENTRAL_PHONE_OTP_ENTRY + '.tsx'))) {
    // allow other uses if present, but flag for review
    results.duplicateFirebaseInitializationCandidates.push(fp);
  }
}

// Deduplicate arrays by JSON string
function uniq(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = typeof x === 'string' ? x : JSON.stringify(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

results.firebaseImports = uniq(results.firebaseImports);
results.otpComponentImports = uniq(results.otpComponentImports);
results.duplicateFirebaseInitializationCandidates = uniq(results.duplicateFirebaseInitializationCandidates);
results.legacyFirebaseReferences = uniq(results.legacyFirebaseReferences);
results.legacyOtpReferences = uniq(results.legacyOtpReferences);
results.brokenImportPathsCandidates = uniq(results.brokenImportPathsCandidates);

// Confirm presence of centralized entries
const centralizedFirebaseAbs = path.join(repoRoot, CENTRAL_FIREBASE_ENTRY + '.ts');
const centralizedOtpAbs = path.join(repoRoot, CENTRAL_PHONE_OTP_ENTRY + '.tsx');

const report = {
  filesScanned: results.filesScanned,
  centralFirebase: {
    path: CENTRAL_FIREBASE_ENTRY + '.ts',
    exists: fs.existsSync(centralizedFirebaseAbs),
  },
  centralPhoneOtp: {
    path: CENTRAL_PHONE_OTP_ENTRY + '.tsx',
    exists: fs.existsSync(centralizedOtpAbs),
  },
  firebaseImports: results.firebaseImports,
  otpComponentImports: results.otpComponentImports,
  duplicateFirebaseInitializationCandidates: results.duplicateFirebaseInitializationCandidates,
  legacyFirebaseReferences: results.legacyFirebaseReferences,
  legacyOtpReferences: results.legacyOtpReferences,
  brokenImportPathsCandidates: results.brokenImportPathsCandidates,
};

const outPath = path.join(repoRoot, 'verify-auth-migration.report.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

console.log('Verification report written to:', outPath);
console.log('Summary:');
console.log('- legacyFirebaseReferences:', results.legacyFirebaseReferences.length);
console.log('- legacyOtpReferences:', results.legacyOtpReferences.length);
console.log('- duplicateFirebaseInitializationCandidates:', results.duplicateFirebaseInitializationCandidates.length);
console.log('- brokenImportPathsCandidates:', results.brokenImportPathsCandidates.length);

// Auto-delete report script itself (per requirement)
// Keep report json only for this run.
process.exit(0);

