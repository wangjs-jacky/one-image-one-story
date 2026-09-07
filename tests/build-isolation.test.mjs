import { execFileSync } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('build isolation', () => {
  it('keeps fixture pages and images separate from a later empty production build', async () => {
    const repository = process.cwd();
    const isolated = await mkdtemp(path.join(os.tmpdir(), 'site-build-isolation-'));
    try {
      await mkdir(path.join(isolated, 'src/content/posts'), { recursive: true });
      await mkdir(path.join(isolated, 'tests'), { recursive: true });
      // Copy site code and test fixtures only; never read or mutate production posts or images.
      for (const source of [
        'astro.config.mjs', 'package.json', 'tsconfig.json', 'src/content.config.ts',
        'src/components', 'src/layouts', 'src/lib', 'src/pages', 'src/styles', 'tests/fixtures',
      ]) {
        await cp(path.join(repository, source), path.join(isolated, source), { recursive: true });
      }
      await symlink(path.join(repository, 'node_modules'), path.join(isolated, 'node_modules'), 'dir');

      const environment = { ...process.env, BASE_PATH: '/build-isolation/', SITE_URL: 'https://example.test' };
      delete environment.POSTS_DIR;
      // Vitest injects Vite's BASE_URL into process.env; let Astro derive it for each build.
      delete environment.BASE_URL;
      const build = (env) => execFileSync(process.execPath, [path.join(repository, 'node_modules/astro/astro.js'), 'build'], {
        cwd: isolated,
        env,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000,
      });

      build({ ...environment, POSTS_DIR: './tests/fixtures/posts' });
      build(environment);

      const productionHome = await readFile(path.join(isolated, 'dist/index.html'), 'utf8');
      expect(productionHome).toContain('<h1 id="site-title">一图一文</h1>');
      expect(productionHome).toContain('href="https://example.test/build-isolation/"');
      expect(productionHome).not.toContain('data-post-card');
      expect(productionHome).not.toContain('/posts/sample/');
      expect(productionHome).not.toContain('/images/posts/sample.png');
      await expect(access(path.join(isolated, 'dist/posts/sample/index.html'))).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(access(path.join(isolated, 'dist/images/posts/sample.png'))).rejects.toMatchObject({ code: 'ENOENT' });

      const fixtureHome = await readFile(path.join(isolated, '.fixture-build/dist/index.html'), 'utf8');
      const fixturePost = await readFile(path.join(isolated, '.fixture-build/dist/posts/sample/index.html'), 'utf8');
      expect(fixtureHome).toContain('data-post-card');
      expect(fixtureHome).toContain('href="/build-isolation/posts/sample/"');
      expect(fixturePost).toContain('src="/build-isolation/images/posts/sample.png"');
      expect(fixturePost).toContain('href="https://example.test/build-isolation/posts/sample/"');
      expect(fixturePost).toContain('property="og:image"');
      expect(fixturePost).toContain('data-copy-link');
      expect(await readFile(path.join(isolated, '.fixture-build/dist/images/posts/sample.png')))
        .toEqual(await readFile(path.join(isolated, 'tests/fixtures/public/images/posts/sample.png')));
    } finally {
      await rm(isolated, { recursive: true, force: true });
    }
  }, 120000);
});
