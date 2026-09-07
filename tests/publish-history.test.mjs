import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('publication history boundary', { timeout: 30000 }, () => {
  let isolated;
  let checkout;
  let remote;
  let environment;
  let baseline;
  let previous;
  let pushAttempt;
  const publisher = path.resolve('scripts/publish-post.mjs');
  const postPath = 'src/content/posts/sample.md';
  const imagePath = 'public/images/posts/sample.png';
  const allowed = new Set([postPath, imagePath]);
  const git = (args, cwd = checkout) => execFileSync('git', args, { cwd, env: environment, encoding: 'utf8', stdio: 'pipe' }).trim();

  beforeEach(async () => {
    isolated = await mkdtemp(path.join(tmpdir(), 'publisher-history-'));
    checkout = path.join(isolated, 'checkout');
    remote = path.join(isolated, 'origin.git');
    pushAttempt = path.join(isolated, 'push-attempt');
    const bin = path.join(isolated, 'bin');
    await mkdir(checkout);
    await mkdir(bin);
    environment = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', PATH: `${bin}${path.delimiter}${process.env.PATH}` };
    // The real validation/Git code runs. Slow build commands are isolated here;
    // full checks run separately. GitHub calls cannot leave this test fixture.
    await writeFile(path.join(bin, 'npm'), '#!/bin/sh\nexit 0\n');
    await writeFile(path.join(bin, 'gh'), '#!/bin/sh\nexit 91\n');
    await chmod(path.join(bin, 'npm'), 0o755);
    await chmod(path.join(bin, 'gh'), 0o755);
    git(['init', '--initial-branch=main', '--template=']);
    git(['config', 'user.name', 'Publisher Test']);
    git(['config', 'user.email', 'publisher-test@example.invalid']);
    git(['config', 'commit.gpgsign', 'false']);
    await writeFile(path.join(checkout, 'README.md'), 'baseline\n');
    git(['add', 'README.md']);
    git(['commit', '-m', 'initial baseline']);
    previous = git(['rev-parse', 'HEAD']);
    await writeFile(path.join(checkout, 'README.md'), 'published code baseline\n');
    git(['commit', '-am', 'published code']);
    baseline = git(['rev-parse', 'HEAD']);
    git(['clone', '--bare', '--no-hardlinks', checkout, remote], isolated);
    git(['remote', 'add', 'origin', remote]);
    await mkdir(path.join(remote, 'hooks'), { recursive: true });
    const receiver = path.join(remote, 'hooks/pre-receive');
    await writeFile(receiver, `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(pushAttempt)}, require('node:fs').readFileSync(0));\nprocess.exit(1);\n`);
    await chmod(receiver, 0o755);
    await mkdir(path.join(checkout, 'src/content/posts'), { recursive: true });
    await mkdir(path.join(checkout, 'public/images/posts'), { recursive: true });
    await copyFile('tests/fixtures/posts/sample.md', path.join(checkout, postPath));
    await copyFile('tests/fixtures/public/images/posts/sample.png', path.join(checkout, imagePath));
  });

  afterEach(async () => {
    await rm(isolated, { recursive: true, force: true });
  });

  const publish = () => spawnSync(process.execPath, [publisher, '--post', postPath, '--image', imagePath, '--message', 'content: sample'], {
    cwd: checkout, env: environment, encoding: 'utf8', timeout: 30000,
  });

  it.each(['ahead', 'behind', 'diverged'])('stops before staging or committing when local HEAD is %s of remote main', async (state) => {
    if (state !== 'ahead') git(['checkout', '--detach', previous]);
    if (state !== 'behind') {
      await writeFile(path.join(checkout, 'unpublished-code.txt'), 'not authorized for content publication\n');
      git(['add', 'unpublished-code.txt']);
      git(['commit', '-m', 'unpublished code']);
    }
    const before = git(['rev-parse', 'HEAD']);

    const result = publish();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Local HEAD must equal remote main before content publication');
    expect(result.stderr).toContain(baseline);
    expect(git(['rev-parse', 'HEAD'])).toBe(before);
    expect(git(['diff', '--cached', '--name-only'])).toBe('');
    expect(git(['rev-parse', 'refs/heads/main'], remote)).toBe(baseline);
    expect(existsSync(pushAttempt)).toBe(false);
  });

  it('does not bootstrap a missing remote main through content publication', () => {
    git(['update-ref', '-d', 'refs/heads/main'], remote);
    const result = publish();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Cannot establish remote main baseline');
    expect(git(['rev-parse', 'HEAD'])).toBe(baseline);
    expect(git(['diff', '--cached', '--name-only'])).toBe('');
    expect(existsSync(pushAttempt)).toBe(false);
  });

  it('preserves the content commit with an actionable error after a rejected push', async () => {
    const result = publish();
    const contentCommit = git(['rev-parse', 'HEAD']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`Local content commit ${contentCommit} was preserved`);
    expect(git(['rev-parse', 'HEAD^'])).toBe(baseline);
    expect(await readFile(pushAttempt, 'utf8')).toBe(`${baseline} ${contentCommit} refs/heads/main\n`);
    expect(git(['rev-parse', 'refs/heads/main'], remote)).toBe(baseline);
  });

  it('does not publish local tags enabled by user Git configuration', async () => {
    git(['config', 'push.followTags', 'true']);
    git(['tag', '-a', 'unpublished-note', '-m', 'not authorized for publication']);

    const result = publish();
    const contentCommit = git(['rev-parse', 'HEAD']);

    expect(result.status).toBe(1);
    expect(await readFile(pushAttempt, 'utf8')).toBe(`${baseline} ${contentCommit} refs/heads/main\n`);
    expect(git(['tag', '--list'], remote)).toBe('');
  });

  it('uses the exact push destination even when the fetch URL differs', async () => {
    const { establishPublicationBaseline } = await import('../scripts/publish-git.mjs');
    git(['remote', 'set-url', '--push', 'origin', remote]);
    git(['remote', 'set-url', 'origin', path.join(isolated, 'missing-fetch-remote')]);
    expect(establishPublicationBaseline({ repositoryRoot: checkout })).toEqual({ commit: baseline, remoteUrl: remote });
  });

  it('rejects multiple push destinations before creating a content commit', () => {
    git(['remote', 'set-url', '--add', '--push', 'origin', remote]);
    git(['remote', 'set-url', '--add', '--push', 'origin', path.join(isolated, 'second-remote.git')]);
    const result = publish();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('exactly one push destination');
    expect(git(['rev-parse', 'HEAD'])).toBe(baseline);
    expect(existsSync(pushAttempt)).toBe(false);
  });

  it('refuses a remote rollback race without attempting an update', async () => {
    const { establishPublicationBaseline, pushPublicationCommit } = await import('../scripts/publish-git.mjs');
    const established = establishPublicationBaseline({ repositoryRoot: checkout });
    git(['add', '--', postPath, imagePath]);
    git(['commit', '-m', 'content: sample']);
    const contentCommit = git(['rev-parse', 'HEAD']);
    // A rollback would permit a normal fast-forward push to silently republish
    // earlier history. The original baseline must still be required at push.
    git(['update-ref', 'refs/heads/main', previous], remote);

    expect(() => pushPublicationCommit(established, contentCommit, allowed, { repositoryRoot: checkout }))
      .toThrow(`Local content commit ${contentCommit} was preserved`);
    expect(git(['rev-parse', 'HEAD'])).toBe(contentCommit);
    expect(git(['rev-parse', 'refs/heads/main'], remote)).toBe(previous);
    expect(existsSync(pushAttempt)).toBe(false);
  });

  it('pushes the validated commit rather than a later moving HEAD', async () => {
    const { establishPublicationBaseline, pushPublicationCommit } = await import('../scripts/publish-git.mjs');
    const established = establishPublicationBaseline({ repositoryRoot: checkout });
    git(['add', '--', postPath, imagePath]);
    git(['commit', '-m', 'content: sample']);
    const contentCommit = git(['rev-parse', 'HEAD']);
    git(['commit', '--allow-empty', '-m', 'concurrent local work']);

    expect(() => pushPublicationCommit(established, contentCommit, allowed, { repositoryRoot: checkout }))
      .toThrow(`Local content commit ${contentCommit} was preserved`);
    expect(await readFile(pushAttempt, 'utf8')).toBe(`${baseline} ${contentCommit} refs/heads/main\n`);
    expect(git(['rev-parse', 'refs/heads/main'], remote)).toBe(baseline);
  });

  it('rejects a content commit with an unexpected parent or committed path', async () => {
    const { establishPublicationBaseline, pushPublicationCommit } = await import('../scripts/publish-git.mjs');
    const established = establishPublicationBaseline({ repositoryRoot: checkout });
    await writeFile(path.join(checkout, 'unexpected.txt'), 'unexpected\n');
    git(['add', '--', postPath, imagePath, 'unexpected.txt']);
    git(['commit', '-m', 'content plus unrelated file']);
    expect(() => pushPublicationCommit(established, git(['rev-parse', 'HEAD']), allowed, { repositoryRoot: checkout }))
      .toThrow('Committed files must be exactly the requested Markdown and PNG pair');
    git(['commit', '--allow-empty', '-m', 'concurrent local commit']);
    expect(() => pushPublicationCommit(established, git(['rev-parse', 'HEAD']), allowed, { repositoryRoot: checkout }))
      .toThrow('Content commit must have remote main as its only parent');
    expect(existsSync(pushAttempt)).toBe(false);
  });
});
