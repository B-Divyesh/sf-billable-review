import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

const root = await mkdtemp(join(tmpdir(), 'billable-review-update-'));
await cp(new URL('../dist/', import.meta.url), root, { recursive: true });

const types = new Map([
  ['.avif', 'image/avif'], ['.css', 'text/css'], ['.html', 'text/html'], ['.js', 'text/javascript'],
  ['.json', 'application/json'], ['.png', 'image/png'], ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json'], ['.webp', 'image/webp']
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    let file = normalize(join(root, relative));
    if (!file.startsWith(root)) throw new Error('Invalid path');
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    } catch {
      if (!extname(file)) file = join(root, 'index.html');
    }
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types.get(extname(file)) || 'application/octet-stream',
      'Cache-Control': pathname === '/sw.js' ? 'no-store' : 'no-cache'
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Could not start update-test server.');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  const workerPath = join(root, 'sw.js');
  const originalWorker = await readFile(workerPath, 'utf8');
  await writeFile(workerPath, originalWorker.replace(/billable-review-shell-[^']+/, 'billable-review-shell-update-regression'));
  await page.evaluate(() => {
    globalThis.__billableReviewControllerChanged = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { globalThis.__billableReviewControllerChanged = true; }, { once: true });
  });
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  await page.getByRole('status').filter({ hasText: 'An update is ready. Reload to use it.' }).waitFor();
  await page.waitForFunction(() => globalThis.__billableReviewControllerChanged === true);
  let cachesAfterUpdate = await page.evaluate(() => caches.keys());
  for (let attempt = 0; attempt < 50 && cachesAfterUpdate.length !== 1; attempt += 1) {
    await page.waitForTimeout(100);
    cachesAfterUpdate = await page.evaluate(() => caches.keys());
  }
  if (cachesAfterUpdate.length !== 1 || cachesAfterUpdate[0] !== 'billable-review-shell-update-regression') {
    throw new Error(`Stale service-worker caches remain: ${cachesAfterUpdate.join(', ')}`);
  }
  process.stdout.write('PWA update notification, activation, and stale-cache cleanup passed.\n');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
