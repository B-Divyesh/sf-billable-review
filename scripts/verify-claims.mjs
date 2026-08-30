import { readFile } from 'node:fs/promises';

const claims = JSON.parse(await readFile(new URL('../.factory/claims.json', import.meta.url), 'utf8'));
const source = await readFile(new URL('../tests/e2e/app.spec.ts', import.meta.url), 'utf8');
const ids = new Set();

for (const claim of claims) {
  if (!claim.id || ids.has(claim.id)) throw new Error(`Claim id is missing or duplicated: ${claim.id}`);
  ids.add(claim.id);
  const tag = `@claim:${claim.id}`;
  const count = source.split(tag).length - 1;
  if (count !== 1) throw new Error(`${tag} must appear in exactly one test; found ${count}.`);
  if (!claim.test.includes(tag)) throw new Error(`${claim.id} test command must select its claim tag.`);
}

const tags = [...source.matchAll(/@claim:([a-z0-9-]+)/g)].map(match => match[1]);
for (const tag of tags) if (!ids.has(tag)) throw new Error(`Test tag @claim:${tag} is not listed in claims.json.`);
console.log(`${claims.length} claims each map to exactly one browser regression.`);
