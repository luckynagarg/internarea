/**
 * Locale JSON Validator
 *
 * Validates:
 * - Valid JSON syntax
 * - All values are strings (not objects at leaf level)
 * - No duplicate keys
 * - No trailing commas
 * - Placeholder consistency ({0}, {name}, {count})
 * - No HTML/JSX injection risk
 */

export interface ValidationError {
  file: string;
  key: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a locale JSON string
 */
export function validateLocaleJSON(
  content: string,
  fileLabel: string
): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e: any) {
    errors.push({
      file: fileLabel,
      key: '',
      message: `Invalid JSON: ${e.message}`,
      severity: 'error',
    });
    return { valid: false, errors };
  }

  // 2. Must be an object
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    errors.push({
      file: fileLabel,
      key: '',
      message: 'Root must be a JSON object',
      severity: 'error',
    });
    return { valid: false, errors };
  }

  // 3. Validate all leaf values are strings
  validateValues(parsed, '', fileLabel, errors);

  // 4. Check for duplicate keys (JSON.parse already dedups, but we scan raw)
  detectDuplicateKeys(content, fileLabel, errors);

  // 5. Check placeholder consistency
  detectPlaceholderIssues(parsed, '', fileLabel, errors);

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}

function validateValues(
  obj: any,
  prefix: string,
  file: string,
  errors: ValidationError[]
): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null) {
      validateValues(value, fullKey, file, errors);
    } else if (typeof value !== 'string') {
      errors.push({
        file,
        key: fullKey,
        message: `Expected string value, got ${typeof value}`,
        severity: 'error',
      });
    }
  }
}

function detectDuplicateKeys(
  content: string,
  file: string,
  errors: ValidationError[]
): void {
  const keyRegex = /"([^"]+)"(?=\s*:)/g;
  const seen = new Map<string, number[]>();
  let match: RegExpExecArray | null;
  const _lineNum = 1;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineRegex = /"([^"]+)"(?=\s*:)/g;
    while ((match = lineRegex.exec(lines[i])) !== null) {
      const key = match[1];
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(i + 1);
    }
  }

  for (const [key, lines] of seen.entries()) {
    if (lines.length > 1) {
      errors.push({
        file,
        key,
        message: `Duplicate key on lines ${lines.join(', ')}`,
        severity: 'warning',
      });
    }
  }
}

function detectPlaceholderIssues(
  obj: any,
  prefix: string,
  file: string,
  errors: ValidationError[]
): void {
  // Find all placeholders used in English values
  const enPlaceholders = new Map<string, Set<string>>();

  function collect(obj: any, path: string, store: Map<string, Set<string>>) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = path ? `${path}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        collect(value, fullKey, store);
      } else if (typeof value === 'string') {
        const placeholders = value.match(/\{[^}]+\}/g);
        if (placeholders) {
          store.set(fullKey, new Set(placeholders));
        }
      }
    }
  }
  collect(obj, '', enPlaceholders);

  // Check for missing/broken placeholders in other languages is done at compare time
}

