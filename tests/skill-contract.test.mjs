import { execFileSync, spawnSync } from 'node:child_process';
import { lstat, mkdtemp, mkdir, readFile, readlink, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const skillPath = path.resolve('skill/one-image-one-story');
const installerPath = path.join(skillPath, 'scripts/install.sh');
const temporaryRoots = [];

const installation = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'one-image-one-story-install-'));
  temporaryRoots.push(root);
  const skillsPath = path.join(root, 'skills');
  await mkdir(skillsPath);
  return {
    root,
    target: path.join(skillsPath, 'one-image-one-story'),
    run: () => spawnSync('bash', [installerPath], {
      cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, CODEX_HOME: root },
    }),
  };
};

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('one-image-one-story skill', () => {
  it('declares the required input and publication contract', async () => {
    const text = await readFile(path.join(skillPath, 'SKILL.md'), 'utf8');
    expect(text).toMatch(/topic.*text.*url/is);
    expect(text).toContain('1600×2000');
    expect(text).toContain('publish:post');
    expect(text).toMatch(/敏感|private|sensitive/i);
  });

  it.skipIf(!process.env.INSTALLED_SKILL_PATH)('resolves the active installation to this canonical source', async () => {
    const installed = process.env.INSTALLED_SKILL_PATH;
    expect((await lstat(installed)).isSymbolicLink()).toBe(true);
    expect(await realpath(installed)).toBe(await realpath(skillPath));
  });

  it('installs under CODEX_HOME from any working directory and leaves a correct link intact on repeat', async () => {
    const { target, run } = await installation();
    expect(run().status).toBe(0);
    expect((await lstat(target)).isSymbolicLink()).toBe(true);
    expect(await readlink(target)).toBe(await realpath(skillPath));
    const before = await lstat(target);
    expect(run().status).toBe(0);
    expect((await lstat(target)).ino).toBe(before.ino);
  });

  it('falls back to HOME/.codex/skills when CODEX_HOME is unset', async () => {
    const home = await mkdtemp(path.join(tmpdir(), 'one-image-one-story-home-'));
    temporaryRoots.push(home);
    const { CODEX_HOME: _codexHome, ...environment } = process.env;
    const result = spawnSync('bash', [installerPath], {
      cwd: tmpdir(), encoding: 'utf8', env: { ...environment, HOME: home },
    });
    const target = path.join(home, '.codex', 'skills', 'one-image-one-story');
    expect(result.status).toBe(0);
    expect((await lstat(target)).isSymbolicLink()).toBe(true);
    expect(await readlink(target)).toBe(await realpath(skillPath));
  });

  it('replaces a stale symlink without changing its former target', async () => {
    const { root, target, run } = await installation();
    const previous = path.join(root, 'previous');
    await mkdir(previous);
    await writeFile(path.join(previous, 'keep.txt'), 'user content');
    await symlink(previous, target);
    expect(run().status).toBe(0);
    expect(await realpath(target)).toBe(await realpath(skillPath));
    expect(await readFile(path.join(previous, 'keep.txt'), 'utf8')).toBe('user content');
  });

  it('replaces a dangling symlink', async () => {
    const { root, target, run } = await installation();
    await symlink(path.join(root, 'missing'), target);
    expect(run().status).toBe(0);
    expect(await realpath(target)).toBe(await realpath(skillPath));
  });

  it.each(['directory', 'file'])('refuses to overwrite an existing real %s', async (kind) => {
    const { target, run } = await installation();
    if (kind === 'directory') await mkdir(target);
    const retained = kind === 'directory' ? path.join(target, 'keep.txt') : target;
    await writeFile(retained, 'user content');
    expect(run().status).toBe(1);
    expect((await lstat(target)).isSymbolicLink()).toBe(false);
    expect(await readFile(retained, 'utf8')).toBe('user content');
  });

  it('has valid Bash syntax', () => {
    expect(() => execFileSync('bash', ['-n', installerPath])).not.toThrow();
  });
});
