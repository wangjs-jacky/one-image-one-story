import { copyFile, mkdir, mkdtemp, rename, rm, rmdir, symlink } from 'node:fs/promises';
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
    const postRoot = path.join(repository, 'src/content/posts');
    const imageRoot = path.join(repository, 'public/images/posts');
    const external = await mkdtemp(path.join(tmpdir(), 'publisher-root-escape-'));
    const movedPostRoot = path.join(external, 'posts');

    await rename(postRoot, movedPostRoot);
    await symlink(movedPostRoot, postRoot, 'dir');
    await copyFile(path.join(repository, 'tests/fixtures/posts/sample.md'), path.join(movedPostRoot, 'sample.md'));
    await mkdir(imageRoot, { recursive: true });
    await copyFile(path.join(repository, 'tests/fixtures/public/images/posts/sample.png'), path.join(imageRoot, 'sample.png'));

    try {
      await expect(validatePost({
        postPath: 'src/content/posts/sample.md',
        imagePath: 'public/images/posts/sample.png',
      })).rejects.toThrow('Approved root resolves outside the repository');
    } finally {
      await rm(path.join(movedPostRoot, 'sample.md'), { force: true });
      await rm(postRoot, { force: true });
      await rename(movedPostRoot, postRoot);
      await rm(path.join(imageRoot, 'sample.png'), { force: true });
      await rmdir(imageRoot);
      await rmdir(path.dirname(imageRoot));
      await rmdir(path.dirname(path.dirname(imageRoot)));
      await rm(external, { recursive: true, force: true });
    }
  });
});
