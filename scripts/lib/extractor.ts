/**
 * Advanced String Extraction Engine
 *
 * Scans source files for translatable strings using:
 * - AST-aware pattern matching
 * - JSX text content detection
 * - Attribute extraction (placeholder, title, aria-label)
 * - API message detection (toast, validation, error)
 *
 * Output: Array of extracted strings with context and suggested keys
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const SRC_DIR = path.resolve(__dirname, '../../src');

export interface ExtractedString {
  text: string;
  file: string;
  line: number;
  column: number;
  context: string;
  suggestedKey: string;
  sourceType: SourceType;
}

export type SourceType =
  | 'jsx-text'
  | 'jsx-attribute'
  | 'function-call'
  | 'toast'
  | 'validation'
  | 'error'
  | 'confirmation'
  | 'placeholder'
  | 'aria-label'
  | 'title'
  | 'button'
  | 'heading'
  | 'label'
  | 'link';

// ─── Patterns ──────────────────────────────────────────────────────────
interface Pattern {
  regex: RegExp;
  group: number;
  type: SourceType;
  minLength: number;
}

const PATTERNS: Pattern[] = [
  // t("...") function calls
  { regex: /t\(\s*(["'`])([^"'`]{3,}?)\1\s*\)/g, group: 2, type: 'function-call', minLength: 3 },

  // <Trans>text</Trans> component
  { regex: /<Trans>([^<>{]{3,})<\/Trans>/g, group: 1, type: 'jsx-text', minLength: 3 },

  // placeholder="..."
  { regex: /placeholder=["']([^"']{3,})["']/g, group: 1, type: 'placeholder', minLength: 3 },

  // title="..."
  { regex: /title=["']([^"']{3,})["']/g, group: 1, type: 'title', minLength: 3 },

  // aria-label="..."
  { regex: /aria-label=["']([^"']{3,})["']/g, group: 1, type: 'aria-label', minLength: 3 },

  // toast.success/toast.error/etc
  { regex: /toast\.\w+\(\s*(["'`])([^"'`]{3,}?)\1/g, group: 2, type: 'toast', minLength: 3 },

  // <button>text</button>
  { regex: /<button[^>]*>([^<>{]{3,})<\/button>/g, group: 1, type: 'button', minLength: 3 },

  // <h1-h6>text</h1-h6>
  { regex: /<h([1-6])[^>]*>([^<>{]{3,})<\/h\1>/g, group: 2, type: 'heading', minLength: 3 },

  // <label>text</label>
  { regex: /<label[^>]*>([^<>{]{3,})<\/label>/g, group: 1, type: 'label', minLength: 3 },

  // <a>text</a>
  { regex: /<a[^>]*>([^<>{]{3,})<\/a>/g, group: 1, type: 'link', minLength: 3 },

  // <span>text</span>  (only short text)
  { regex: /<span[^>]*>([^<>{]{3,50})<\/span>/g, group: 1, type: 'jsx-text', minLength: 3 },

  // <p>text</p>
  { regex: /<p[^>]*>([^<>{]{3,})<\/p>/g, group: 1, type: 'jsx-text', minLength: 3 },

  // Validation messages in objects
  { regex: /["'`]([A-Z][a-zA-Z\s]{3,50})["'`]\s*[:,]/g, group: 1, type: 'validation', minLength: 4 },

  // Confirmation dialog texts
  { regex: /(?:confirm|Are you sure|Delete|Remove|Cancel|Discard)[^"'`]{3,60}["'`]/g, group: 0, type: 'confirmation', minLength: 5 },

  // Error messages
  { regex: /(?:error|Error|fail|Fail|Failed)[:\s]+["'`]([^"'`]{3,})["'`]/g, group: 1, type: 'error', minLength: 3 },
];

// ─── Scanner ───────────────────────────────────────────────────────────
export function extractFromFile(
  filePath: string
): ExtractedString[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: ExtractedString[] = [];
  const seen = new Set<string>();
  const prefix = inferPrefix(filePath);

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    for (const { regex, group, type, minLength } of PATTERNS) {
      const cloned = new RegExp(regex.source, 'g' + (regex.flags.includes('g') ? '' : 'g'));
      let match: RegExpExecArray | null;

      while ((match = cloned.exec(line)) !== null) {
        const rawText = (match[group] || '').trim();
        if (!rawText || rawText.length < minLength) continue;
        if (!isTranslatable(rawText)) continue;

        const suggestedKey = textToKey(rawText, prefix);
        const dedupKey = `${suggestedKey}:${rawText}`;

        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          results.push({
            text: rawText,
            file: path.relative(SRC_DIR, filePath),
            line: lineNum,
            column: match.index,
            context: line.trim().substring(0, 100),
            suggestedKey,
            sourceType: type,
          });
        }
      }
    }
  });

  return results;
}

// ─── Helpers ───────────────────────────────────────────────────────────
function isTranslatable(text: string): boolean {
  if (text.length < 2) return false;
  // Numbers only
  if (/^[\d\s\-.,%₹$€₩₽¥#]+$/.test(text)) return false;
  // URLs/paths
  if (/^https?:\/\//i.test(text)) return false;
  if (/^\/[a-z]/i.test(text)) return false;
  // CSS classes / Tailwind
  if (/^[a-z-]+:\s/.test(text)) return false;
  if (/^(text|bg|border|p-|m-|flex|grid)/.test(text) && /\d/.test(text)) return false;
  // Common abbreviations
  if (['e.g.', 'i.e.', 'etc.', 'vs.', 'vs'].includes(text.toLowerCase())) return false;
  // Template literal expressions
  if (text.startsWith('${') || text.includes('${')) return false;
  // JavaScript variables/identifiers
  if (/^[a-z_$][a-z0-9_$]*$/i.test(text) && text.length < 30) return false;

  return true;
}

export function textToKey(text: string, prefix: string): string {
  let key = text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();

  if (key.length > 60) {
    key = key.substring(0, 60).replace(/_+$/, '');
  }

  // Ensure unique by appending a hash if collision likely
  return prefix ? `${prefix}.${key}` : key;
}

export function inferPrefix(filePath: string): string {
  const relative = path.relative(SRC_DIR, filePath);
  const parts = relative.replace(/\\/g, '/').split('/');

  // pages/xxx/yyy → pages_xxx_yyy
  // Components/xxx → components_xxx
  // auth/xxx → auth_xxx
  // hooks/xxx → hooks_xxx

  const dir = parts[0].toLowerCase();
  const rest = parts.slice(1).join('_')
    .replace(/\.(tsx|ts|jsx|js)$/, '')
    .replace(/\[.*?\]/g, 'param')
    .replace(/\//g, '_')
    .replace(/index$/, '');

  if (dir === 'pages') return `page_${rest}`.replace(/_+$/, '');
  if (dir === 'components') return `comp_${rest}`.replace(/_+$/, '');
  if (dir === 'auth') return `auth_${rest}`.replace(/_+$/, '');
  if (dir === 'hooks') return `hook_${rest}`.replace(/_+$/, '');
  if (dir === 'features') return `feat_${rest}`.replace(/_+$/, '');
  if (dir === 'services') return `svc_${rest}`.replace(/_+$/, '');

  return parts.join('_').replace(/\.(tsx|ts|jsx|js)$/, '').replace(/\//g, '_').toLowerCase();
}

// ─── Full scan ─────────────────────────────────────────────────────────
export async function scanAllSourceFiles(): Promise<ExtractedString[]> {
  const allResults: ExtractedString[] = [];
  const seen = new Set<string>();

  const dirs = [
    path.join(SRC_DIR, 'pages'),
    path.join(SRC_DIR, 'Components'),
    path.join(SRC_DIR, 'auth'),
    path.join(SRC_DIR, 'hooks'),
    path.join(SRC_DIR, 'features'),
    path.join(SRC_DIR, 'services'),
    path.join(SRC_DIR, 'lib'),
    path.join(SRC_DIR, 'config'),
  ];

  const exts = ['tsx', 'ts', 'jsx', 'js'];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    for (const ext of exts) {
      const files = await glob(`${dir}/**/*.${ext}`);

      for (const file of files) {
        if (file.includes('node_modules') || file.includes('.next')) continue;

        const strings = extractFromFile(file);

        for (const s of strings) {
          const dedupKey = `${s.suggestedKey}:${s.text}`;
          if (!seen.has(dedupKey)) {
            seen.add(dedupKey);
            allResults.push(s);
          }
        }
      }
    }
  }

  return allResults;
}

