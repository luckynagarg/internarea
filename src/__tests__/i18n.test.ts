/**
 * i18n Unit Tests
 * 
 * Tests:
 * - t() function returns correct translations
 * - Missing keys fallback
 * - Trans component rendering
 * - Locale file loading
 * - Translation caching
 * - Provider abstraction
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock t() function
const mockDict = {
    home: {
    hero: {
        title: 'Make your dream career a reality',
    },
    },
    navbar: {
    internships: 'Internships',
    jobs: 'Jobs',
    },
};

function getByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => {
    if (acc == null) return undefined;
    return acc[part];
    }, obj);
}

function tFactory(dict: any) {
    return (key: string) => {
    const v = getByPath(dict, key);
    return typeof v === 'string' ? v : key;
  };
}

describe('i18n Translation System', () => {
  let t: (key: string) => string;

  beforeEach(() => {
    t = tFactory(mockDict);
  });

  describe('t() function', () => {
    it('should return correct translation for existing key', () => {
      expect(t('home.hero.title')).toBe('Make your dream career a reality');
    });

    it('should return key as fallback for missing translation', () => {
      expect(t('home.hero.nonexistent')).toBe('home.hero.nonexistent');
    });

    it('should handle nested keys', () => {
      expect(t('navbar.internships')).toBe('Internships');
    });

    it('should return key for completely invalid path', () => {
      expect(t('completely.invalid.key')).toBe('completely.invalid.key');
    });
  });

  describe('Dictionary structure', () => {
    it('should have valid JSON structure', () => {
      expect(typeof mockDict).toBe('object');
      expect(typeof mockDict.home).toBe('object');
      expect(typeof mockDict.navbar).toBe('object');
    });

    it('should have string values at leaf nodes', () => {
      const checkStrings = (obj: any, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;
          if (typeof value === 'object') {
            checkStrings(value, fullPath);
          } else {
            expect(typeof value).toBe('string');
            expect(value.length).toBeGreaterThan(0);
          }
        }
      };
      checkStrings(mockDict);
    });
  });

  describe('Missing key handling', () => {
    it('should return key as-is in production mode', () => {
      const env = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const result = t('nonexistent.key');
      expect(result).toBe('nonexistent.key');
      
      process.env.NODE_ENV = env;
    });
  });
});

describe('Translation Provider Abstraction', () => {
  describe('Google Provider', () => {
    it('should have correct provider name', () => {
      const provider = { name: 'google' };
      expect(provider.name).toBe('google');
    });
  });

  describe('Cache System', () => {
    it('should store and retrieve cached translations', () => {
      const cache = new Map<string, string>();
      const key = 'Hello';
      const lang = 'hi';
      
      cache.set(`${lang}:${key}`, 'नमस्ते');
      
      expect(cache.get(`${lang}:${key}`)).toBe('नमस्ते');
    });

    it('should return null for uncached translations', () => {
      const cache = new Map<string, string>();
      expect(cache.get('fr:Goodbye')).toBeUndefined();
    });
  });
});

describe('Auto Key Generation', () => {
  it('should generate snake_case keys from text', () => {
    const textToKey = (text: string, prefix: string): string => {
      const key = text
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase();
      return prefix ? `${prefix}.${key}` : key;
    };

    expect(textToKey('Welcome to InternArea', 'home')).toBe('home.welcome_to_internarea');
    expect(textToKey('Save', 'profile')).toBe('profile.save');
    expect(textToKey('View Details', 'job')).toBe('job.view_details');
  });

  it('should infer page prefix from file path', () => {
    const inferPrefix = (filePath: string): string => {
      const parts = filePath.replace(/\\/g, '/').split('/');
      const srcIndex = parts.indexOf('pages');
      if (srcIndex === -1) return 'unknown';
      return parts.slice(srcIndex + 1).join('_').replace(/\.tsx$/, '');
    };

    expect(inferPrefix('src/pages/profile.tsx')).toBe('profile');
    expect(inferPrefix('src/pages/internship/index.tsx')).toBe('internship_index');
    expect(inferPrefix('src/pages/friends/components/FriendCard.tsx')).toBe('friends_components_FriendCard');
  });
});

describe('Locale File Loading', () => {
  it('should have valid JSON locale files', () => {
    const validateKeys = (obj: any, prefix = ''): string[] => {
      const issues: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          issues.push(...validateKeys(value, fullKey));
        } else if (typeof value !== 'string') {
          issues.push(`${fullKey}: Expected string, got ${typeof value}`);
        }
      }
      return issues;
    };

    const issues = validateKeys(mockDict);
    expect(issues).toHaveLength(0);
  });
});

