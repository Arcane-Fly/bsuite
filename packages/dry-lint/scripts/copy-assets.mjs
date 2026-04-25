import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const src = resolve(root, 'src/ownership-map.json');
const dest = resolve(root, 'dist/ownership-map.json');

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log('[dry-lint] copied ownership-map.json -> dist/');
