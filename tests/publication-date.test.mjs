import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';

it('renders the Shanghai publication day on home and detail when built in UTC', async () => {
  const repository = process.cwd();
  const isolated = await mkdtemp(path.join(os.tmpdir(), 'publication-date-'));
  try {
    await mkdir(path.join(isolated, 'src'), { recursive: true });
    await mkdir(path.join(isolated, 'tests'), { recursive: true });
    for (const source of [
      'astro.config.mjs', 'package.json', 'tsconfig.json', 'src/content.config.ts',
      'src/components', 'src/layouts', 'src/lib', 'src/pages', 'src/styles', 'tests/fixtures',
    ]) {
      await cp(path.join(repository, source), path.join(isolated, source), { recursive: true });
    }
    await symlink(path.join(repository, 'node_modules'), path.join(isolated, 'node_modules'), 'dir');
    const fixture = path.join(isolated, 'tests/fixtures/posts/sample.md');
    const markdown = await readFile(fixture, 'utf8');
    // This instant is September 7 in UTC and September 8 in Asia/Shanghai.
    await writeFile(fixture, markdown.replace(/^publishedAt:.*$/m, 'publishedAt: "2026-09-08T00:30:00+08:00"'));
    const environment = {
      ...process.env, TZ: 'UTC', POSTS_DIR: './tests/fixtures/posts',
      BASE_PATH: '/', SITE_URL: 'https://example.test',
    };
    delete environment.BASE_URL;
    execFileSync(process.execPath, [path.join(repository, 'node_modules/astro/astro.js'), 'build'], {
      cwd: isolated, env: environment, encoding: 'utf8', stdio: 'pipe', timeout: 60000,
    });

    for (const route of ['index.html', 'posts/sample/index.html']) {
      const html = await readFile(path.join(isolated, '.fixture-build/dist', route), 'utf8');
      const dates = [...html.matchAll(/<p class="post-card-date">([^<]+)<\/p>/g)].map((match) => match[1]);
      expect.soft(dates, route).toEqual(['2026年9月8日']);
    }
  } finally {
    await rm(isolated, { recursive: true, force: true });
  }
}, 90000);
