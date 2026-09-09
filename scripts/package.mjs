/**
 * Builds dist/ and zips it for the Chrome Web Store.
 *
 *   node scripts/package.mjs   ->  highlights-for-youtube-<version>.zip  (repo root)
 *
 * The zip holds the *contents* of dist/ (manifest.json at the root), which is
 * what the Web Store expects. Needs the `zip` CLI (present on macOS/Linux).
 */
import { execFileSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const zipName = `highlights-for-youtube-${version}.zip`;
const zipPath = resolve(root, zipName);

execFileSync('node', ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' });

await rm(zipPath, { force: true });
execFileSync('zip', ['-qr', zipPath, '.', '-x', '.*'], {
	cwd: resolve(root, 'dist'),
	stdio: 'inherit',
});

console.log(`[package] ${zipName}`);
