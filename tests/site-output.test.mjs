import { access, readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

describe('static output', () => {
  it('keeps card titles quiet and gives copy feedback a designed state', async () => {
    const styles = await readFile('src/styles/global.css', 'utf8');

    expect(styles).toMatch(/\.post-card h2 a\s*\{[^}]*text-decoration:\s*none/);
    expect(styles).toMatch(/\.post-card h2 a:hover\s*,\s*\.post-card h2 a:focus-visible\s*\{[^}]*color:\s*var\(--accent\)/);
    expect(styles).toMatch(/\[data-copy-link\]\s*\{[^}]*border-radius:\s*999px/);
    expect(styles).toMatch(/\[data-copy-link\]\[data-copy-state=['"]?success['"]?\]\s*\{[^}]*background:/);
  });

  it('renders gallery and permanent route metadata', async () => {
    const home = await readFile('.fixture-build/dist/index.html', 'utf8');
    const post = await readFile('.fixture-build/dist/posts/sample/index.html', 'utf8');
    // check-fixture always builds at /. Expectations must not be derived from
    // the rendered canonical itself. Non-root URLs are covered by build isolation.
    const origin = (process.env.SITE_URL ?? 'http://localhost:4321').replace(/\/$/, '');
    const imagePath = '/images/posts/sample.png';

    expect(home).toContain('data-post-card');
    expect(home).toContain('class="post-card-media"');
    expect(home).toContain('aspect-ratio:4 / 5');
    expect(home).toContain('href="/posts/sample/"');
    expect(home).toContain(`src="${imagePath}"`);
    expect(home).toContain(`<link rel="canonical" href="${origin}/">`);
    expect(home).toContain('<meta property="og:type" content="website">');
    expect(home).toContain(`<meta property="og:url" content="${origin}/">`);
    expect(home).toContain('<meta name="twitter:card" content="summary">');
    expect(home).toContain('<meta name="twitter:title" content="一图一文">');
    expect(home).toContain('<meta name="twitter:description" content="一张图，一个值得留存的故事。">');
    expect(home).not.toContain('name="twitter:image"');
    expect(post).toContain(`<link rel="canonical" href="${origin}/posts/sample/">`);
    expect(post).toContain('<meta property="og:type" content="article">');
    expect(post).toContain(`<meta property="og:url" content="${origin}/posts/sample/">`);
    expect(post).toContain(`<meta property="og:image" content="${origin}/images/posts/sample.png">`);
    expect(post).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(post).toContain('<meta name="twitter:title" content="样例图像">');
    expect(post).toContain('<meta name="twitter:description" content="用于验证静态画廊与永久文章页输出的样例内容。">');
    expect(post).toContain(`<meta name="twitter:image" content="${origin}/images/posts/sample.png">`);
    expect(post).toContain('<meta name="twitter:image:alt" content="一张用于测试的暖色调样例图片">');
    expect(post).toContain(`src="${imagePath}"`);
    expect(post).toContain('data-copy-link');
    expect(post).toContain('href="https://example.test/articles/sample?ref=gallery&lang=zh" rel="noreferrer"');
  });

  it('ships the fixture image used by the generated pages', async () => {
    await access('tests/fixtures/public/images/posts/sample.png');
    await access('.fixture-build/dist/images/posts/sample.png');
  });

  it.each(['success', 'error'])('shows clipboard %s after the click event has finished dispatching', async (outcome) => {
    const post = await readFile('.fixture-build/dist/posts/sample/index.html', 'utf8');
    const script = post.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
    expect(script).toBeTruthy();
    let click;
    const button = { textContent: '复制永久链接', dataset: {}, addEventListener: (_type, handler) => { click = handler; } };
    const url = 'https://example.test/one-image-one-story/posts/sample/';
    let settle;
    const clipboard = new Promise((resolve, reject) => { settle = outcome === 'success' ? resolve : reject; });
    let copied;
    runInNewContext(script, {
      document: { querySelector: () => button },
      navigator: { clipboard: { writeText: (value) => { copied = value; return clipboard; } } },
      location: { href: url },
    });
    const event = { currentTarget: button };
    const pending = click(event);
    event.currentTarget = null; // DOM dispatch clears currentTarget before await resumes.
    settle(outcome === 'error' ? new Error('clipboard permission denied') : undefined);

    await expect(pending).resolves.toBeUndefined();
    expect(copied).toBe(url);
    expect(button.textContent).toBe(outcome === 'success' ? '已复制' : '复制失败，请重试');
    expect(button.dataset.copyState).toBe(outcome);
  });
});
