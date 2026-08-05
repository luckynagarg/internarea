'use client';

import React from 'react';
import { useLanguage } from './LanguageContext';

/**
 * Trans component - auto-translates children text
 * 
 * Usage:
 *   <Trans>Welcome to InternArea</Trans>
 *   <Trans key="home.welcome">Welcome</Trans>  // explicit key
 * 
 * The key is auto-generated from the text content.
 */

interface TransProps {
  children: string;
  key?: string;
  values?: Record<string, string | number>;
  as?: React.ElementType;
  className?: string;
}

function textToKey(text: string, prefix = 'inline'): string {
  let key = text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
  if (key.length > 50) key = key.substring(0, 50).replace(/_+$/, '');
  return `${prefix}.${key}`;
}

export function Trans({ children, key: explicitKey, values, as: Tag = 'span', className }: TransProps) {
  const { t } = useLanguage();
  const translationKey = explicitKey || textToKey(children);
  let translated = t(translationKey);
  
  // Fallback to children text if key not found (key is returned as-is)
  if (translated === translationKey) {
    translated = children;
  }

  // Replace value placeholders like {name}, {count}
  if (values) {
    translated = translated.replace(/\{(\w+)\}/g, (_, key) => {
      return String(values[key] ?? `{${key}}`);
    });
  }

  return <Tag className={className}>{translated}</Tag>;
}

/**
 * Helper to create a typed t function that supports placeholders
 */
export function tWithValues(t: (key: string) => string, key: string, values?: Record<string, string | number>): string {
  let text = t(key);
  if (values) {
    text = text.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
  }
  return text;
}

