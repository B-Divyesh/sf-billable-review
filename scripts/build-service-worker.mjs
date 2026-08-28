import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const distAssets = new URL('../dist/assets/', import.meta.url);
const templateUrl = new URL('../public/sw.js', import.meta.url);
const outputUrl = new URL('../dist/sw.js', import.meta.url);
const files = (await readdir(distAssets)).filter(name => /\.(?:css|js)$/.test(name)).sort();
const assets = files.map(name => `/assets/${name}`);
const hash = createHash('sha256');
for (const name of files) hash.update(name).update(await readFile(new URL(name, distAssets)));
const version = hash.digest('hex').slice(0, 12);
const template = await readFile(templateUrl, 'utf8');
const worker = template
  .replace("['__BUILD_ASSETS__']", JSON.stringify(assets))
  .replace('__CACHE_VERSION__', version);
await writeFile(outputUrl, worker);
