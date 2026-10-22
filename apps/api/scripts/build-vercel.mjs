// Bundles the API into one Vercel function using the Build Output API (.vercel/output),
// so Vercel doesn't need to understand the workspace layout or the .ts import style.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.vercel/output');
const fn = join(out, 'functions/index.func');

await rm(out, { recursive: true, force: true });
await mkdir(fn, { recursive: true });

await build({
  entryPoints: [join(root, 'src/vercel.ts')],
  outfile: join(fn, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // Optional MongoDB driver add-ons we don't use; the driver loads them lazily and copes without them.
  external: ['kerberos', '@mongodb-js/zstd', 'snappy', 'socks', 'aws4', 'mongodb-client-encryption', 'gcp-metadata', '@aws-sdk/credential-providers'],
  // Some bundled CommonJS dependencies call require() at runtime.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'info',
});

await writeFile(
  join(fn, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 30 }, null, 2),
);
await writeFile(join(out, 'config.json'), JSON.stringify({ version: 3, routes: [{ src: '/(.*)', dest: '/index' }] }, null, 2));
