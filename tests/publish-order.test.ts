import { describe, expect, it } from 'vitest';
import { runPublicationChecks } from '../scripts/publish-checks.mjs';

describe('publication checks', () => {
  it('checks fixture output before a production-input build', () => {
    const calls: Array<{ command: string; args: string[]; options?: { env?: NodeJS.ProcessEnv } }> = [];
    const run = (command: string, args: string[], options?: { env?: NodeJS.ProcessEnv }) => calls.push({ command, args, options });

    runPublicationChecks(run, { POSTS_DIR: './tests/fixtures/posts', BASE_PATH: '/', CI: '1' });

    expect(calls).toEqual([
      { command: 'npm', args: ['run', 'check'] },
      { command: 'npm', args: ['run', 'build', '--', '--force'], options: { env: { BASE_PATH: '/', CI: '1' } } },
    ]);
  });
});
