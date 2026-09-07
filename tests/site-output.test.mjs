import { access, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('static output', () => {
  it('renders gallery and permanent route metadata', async () => {
    const home = await readFile('.fixture-build/dist/index.html', 'utf8');
    const post = await readFile('.fixture-build/dist/posts/sample/index.html', 'utf8');
    // Inspect the fixture build's base, even after a differently configured production build.
    const canonical = home.match(/<link rel="canonical" href="([^"]+)"/);
    expect(canonical).not.toBeNull();
    const basePath = new URL(canonical[1]).pathname.replace(/\/$/, '');
    const imagePath = `${basePath}/images/posts/sample.png`;

    expect(home).toContain('data-post-card');
    expect(home).toContain('class="post-card-media"');
    expect(home).toContain('aspect-ratio:4 / 5');
    expect(home).toContain(`href="${basePath}/posts/sample/"`);
    expect(home).toContain(`src="${imagePath}"`);
    expect(post).toContain('property="og:image"');
    expect(post).toContain(`src="${imagePath}"`);
    expect(post).toContain('rel="canonical"');
    expect(post).toContain('data-copy-link');
  });

  it('ships the fixture image used by the generated pages', async () => {
    await access('tests/fixtures/public/images/posts/sample.png');
    await access('.fixture-build/dist/images/posts/sample.png');
  });
});
