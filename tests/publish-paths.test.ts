import { copyFile, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyPostPaths, validatePost } from '../scripts/validate-post.mjs';

describe('publication paths', () => {
  it('classifies only matched production and fixture root pairs', () => {
    expect(classifyPostPaths('src/content/posts/a.md', 'public/images/posts/a.png')).toBe('production');
    expect(classifyPostPaths('tests/fixtures/posts/a.md', 'tests/fixtures/public/images/posts/a.png')).toBe('fixture');
  });

  it('rejects paths outside or across the approved root pairs', () => {
    expect(() => classifyPostPaths('src/content/posts/a.md', 'tests/fixtures/public/images/posts/a.png')).toThrow('matching approved roots');
    expect(() => classifyPostPaths('notes/a.md', 'public/images/posts/a.png')).toThrow('matching approved roots');
  });

  it('rejects an approved post root symlinked outside the repository', async () => {
    const repository = process.cwd();
    const isolatedRepository = await mkdtemp(path.join(tmpdir(), 'publisher-isolated-repository-'));
    const externalRoot = await mkdtemp(path.join(tmpdir(), 'publisher-root-escape-'));
    const postRoot = path.join(isolatedRepository, 'src/content/posts');
    const imageRoot = path.join(isolatedRepository, 'public/images/posts');

    await mkdir(path.dirname(postRoot), { recursive: true });
    await mkdir(imageRoot, { recursive: true });
    await copyFile(path.join(repository, 'tests/fixtures/posts/sample.md'), path.join(externalRoot, 'sample.md'));
    await symlink(externalRoot, postRoot, 'dir');
    await copyFile(path.join(repository, 'tests/fixtures/public/images/posts/sample.png'), path.join(imageRoot, 'sample.png'));
    const imageBefore = await readFile(path.join(imageRoot, 'sample.png'));

    try {
      await expect(validatePost({
        postPath: 'src/content/posts/sample.md',
        imagePath: 'public/images/posts/sample.png',
      }, { repositoryRoot: isolatedRepository })).rejects.toThrow('Approved root resolves outside the repository');
      expect(await readFile(path.join(imageRoot, 'sample.png'))).toEqual(imageBefore);
    } finally {
      await rm(isolatedRepository, { recursive: true, force: true });
      await rm(externalRoot, { recursive: true, force: true });
    }
  }, 30000);
});
