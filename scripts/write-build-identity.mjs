import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const identity = {
  product: 'billable-review',
  commit: git('rev-parse', 'HEAD'),
  commit_time: git('show', '-s', '--format=%cI', 'HEAD'),
  dirty: Boolean(git('status', '--porcelain', '--untracked-files=no'))
};

await writeFile(new URL('../dist/build.json', import.meta.url), `${JSON.stringify(identity, null, 2)}\n`);
