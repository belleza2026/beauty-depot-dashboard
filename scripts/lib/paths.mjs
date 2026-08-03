import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');
export const DATA_DIR = join(ROOT, 'public', 'data');
export const SNAP_DIR = join(DATA_DIR, 'snapshots');
export const HIST_DIR = join(DATA_DIR, 'history');
