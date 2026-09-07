import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fixtureEnvironment } from './fixture-environment.mjs';

const run = (command, args) => {
  const result = spawnSync(path.join(process.cwd(), 'node_modules', '.bin', command), args, {
    cwd: process.cwd(),
    env: fixtureEnvironment(),
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run('astro', ['build']);
run('astro', ['check']);
run('vitest', ['run']);
