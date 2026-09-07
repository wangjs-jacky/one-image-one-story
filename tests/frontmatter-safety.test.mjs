import { existsSync, writeFileSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validatePost } from '../scripts/validate-post.mjs';

describe('YAML-only post frontmatter', () => {
  let repositoryRoot;
  let marker;
  let sample;
  const postPath = 'src/content/posts/sample.md';
  const imagePath = 'public/images/posts/sample.png';

  beforeEach(async () => {
    repositoryRoot = await mkdtemp(path.join(tmpdir(), 'post-frontmatter-safety-'));
    marker = path.join(repositoryRoot, 'executed');
    await mkdir(path.join(repositoryRoot, 'src/content/posts'), { recursive: true });
    await mkdir(path.join(repositoryRoot, 'public/images/posts'), { recursive: true });
    sample = await readFile('tests/fixtures/posts/sample.md', 'utf8');
    await writeFile(path.join(repositoryRoot, postPath), sample);
    await copyFile('tests/fixtures/public/images/posts/sample.png', path.join(repositoryRoot, imagePath));
    matter.engines.reviewengine = {
      parse() {
        writeFileSync(marker, 'custom engine executed');
        return { slug: 'other' };
      },
    };
  });

  afterEach(async () => {
    delete matter.engines.reviewengine;
    await rm(repositoryRoot, { recursive: true, force: true });
  });

  for (const target of ['requested post', 'sibling post']) {
    it.each(['---javascript\n', '--- javascript\n', '\uFEFF---javascript\r\n', '---reviewengine\n', '---json\n'])(
      `rejects %j in the ${target} before executing an engine`, async (opening) => {
        const attackedPath = target === 'requested post' ? postPath : 'src/content/posts/sibling.md';
        const payload = `({ slug: "other", effect: require("node:fs").writeFileSync(${JSON.stringify(marker)}, "executed") })`;
        await writeFile(path.join(repositoryRoot, attackedPath), `${opening}${payload}\n---\n正文`);

        const error = await validatePost({ postPath, imagePath }, { repositoryRoot }).then(() => null, (error) => error);

        expect(existsSync(marker)).toBe(false);
        expect(error?.message).toContain('YAML-only frontmatter');
        expect(error?.message).toContain(attackedPath);
      },
    );
  }

  it.each(['---\n', '---yaml\n', '---yml\n', '\uFEFF---yaml\r\n'])(
    'accepts %j YAML frontmatter for the requested post and siblings', async (opening) => {
      await writeFile(path.join(repositoryRoot, postPath), sample.replace(/^---\n/, opening));
      await writeFile(path.join(repositoryRoot, 'src/content/posts/sibling.md'),
        sample.replace(/^---\n/, opening).replace('slug: sample', 'slug: sibling'));

      await expect(validatePost({ postPath, imagePath }, { repositoryRoot })).resolves.toMatchObject({ slug: 'sample' });
      expect(existsSync(marker)).toBe(false);
    },
  );
});
