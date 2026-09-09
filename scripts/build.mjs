/**
 * Assembles the loadable extension into dist/.
 *
 *   node scripts/build.mjs          one-off build
 *   node scripts/build.mjs --watch  rebuild on change
 *
 * Two bundles, one per execution world (see src/manifest.json):
 *   src/page/index.ts     -> dist/page.js      (world: MAIN, document_start)
 *   src/content/index.ts  -> dist/content.js   (world: ISOLATED, document_end)
 */
import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = resolve(root, 'dist');
const watch = process.argv.includes('--watch');
const dev = watch || process.argv.includes('--dev');

const shared = {
	bundle: true,
	format: 'iife',
	target: 'chrome111',
	charset: 'utf8',
	legalComments: 'none',
	logLevel: 'info',
	sourcemap: watch ? 'inline' : false,
	minify: !dev,
	absWorkingDir: root,
};

/** Copy the static payload (manifest, styles, icons, locales) into dist/. */
async function copyAssets() {
	const [pkg, manifest] = await Promise.all([
		readFile('package.json', 'utf8').then(JSON.parse),
		readFile('src/manifest.json', 'utf8').then(JSON.parse),
	]);
	// package.json is the single source of truth for the version.
	manifest.version = pkg.version;
	await writeFile(`${outdir}/manifest.json`, `${JSON.stringify(manifest, null, '\t')}\n`);

	await cp('src/styles/content.css', `${outdir}/content.css`);
	await cp('img', `${outdir}/img`, { recursive: true });
	await cp('_locales', `${outdir}/_locales`, { recursive: true });
}

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

const entries = [
	{ in: 'src/content/index.ts', out: 'content' },
	{ in: 'src/page/index.ts', out: 'page' },
];

if (watch) {
	const contexts = await Promise.all(
		entries.map((e) => esbuild.context({ ...shared, entryPoints: { [e.out]: e.in }, outdir })),
	);
	await Promise.all(contexts.map((c) => c.watch()));
	await copyAssets();
	console.log('[build] watching src/ …');
} else {
	await Promise.all(
		entries.map((e) => esbuild.build({ ...shared, entryPoints: { [e.out]: e.in }, outdir })),
	);
	await copyAssets();
	console.log('[build] wrote dist/');
}
