/**
 * Backup and Restore utilities
 *
 * Automatically creates backups before updating locale files.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../');
const LOCALES_DIR = path.join(ROOT, 'src/locales');
const BACKUP_DIR = path.join(LOCALES_DIR, '__backups');

/**
 * Create a timestamped backup of all locale files
 */
export function createBackup(label: string = 'manual'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-${label}-${timestamp}`;
  const dest = path.join(BACKUP_DIR, backupName);

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Backup all locale files (both monolithic and chunked)
  const items = fs.readdirSync(LOCALES_DIR).filter((f) => {
    if (f === '__backups') return false;
    const fullPath = path.join(LOCALES_DIR, f);
    return fs.statSync(fullPath).isDirectory() || f.endsWith('.json');
  });

  for (const item of items) {
    const src = path.join(LOCALES_DIR, item);
    const dst = path.join(dest, item);
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dst, { recursive: true });
    } else {
      fs.copyFileSync(src, dst);
    }
  }

  return dest;
}

/**
 * List available backups
 */
export function listBackups(): { name: string; date: Date; size: number }[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => {
      const fullPath = path.join(BACKUP_DIR, f);
      return fs.statSync(fullPath).isDirectory();
    })
    .map((name) => {
      const fullPath = path.join(BACKUP_DIR, name);
      const size = getDirSize(fullPath);
      const date = fs.statSync(fullPath).birthtime;
      return { name, date, size };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

function getDirSize(dir: string): number {
  let total = 0;
  try {
    const files = fs.readdirSync(dir, { recursive: true }) as string[];
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isFile()) {
        total += fs.statSync(fullPath).size;
      }
    }
  } catch {}
  return total;
}

/**
 * Restore from a backup
 */
export function restoreBackup(
  backupName: string
): { restored: number; errors: string[] } {
  const src = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(src)) {
    throw new Error(`Backup "${backupName}" not found`);
  }

  // Create a pre-restore backup first
  createBackup('pre-restore');

  const errors: string[] = [];
  let restored = 0;

  const items = fs.readdirSync(src);
  for (const item of items) {
    const itemSrc = path.join(src, item);
    const itemDst = path.join(LOCALES_DIR, item);

    try {
      if (fs.statSync(itemSrc).isDirectory()) {
        if (fs.existsSync(itemDst)) {
          fs.rmSync(itemDst, { recursive: true });
        }
        fs.cpSync(itemSrc, itemDst, { recursive: true });
      } else {
        fs.copyFileSync(itemSrc, itemDst);
      }
      restored++;
    } catch (e: any) {
      errors.push(`Failed to restore ${item}: ${e.message}`);
    }
  }

  return { restored, errors };
}

/**
 * Prune old backups (keep last N)
 */
export function pruneBackups(keep: number = 10): number {
  const backups = listBackups();
  const toDelete = backups.slice(keep);

  for (const b of toDelete) {
    const fullPath = path.join(BACKUP_DIR, b.name);
    fs.rmSync(fullPath, { recursive: true });
  }

  return toDelete.length;
}

