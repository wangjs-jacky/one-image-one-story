import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('static output', () => {
  it('renders gallery and permanent route metadata', async () => {
    const home = await readFile('dist/index.html', 'utf8');
    const post = await readFile('dist/posts/sample/index.html', 'utf8');

    expect(home).toContain('data-post-card');
    expect(post).toContain('property="og:image"');
    expect(post).toContain('rel="canonical"');
    expect(post).toContain('data-copy-link');
  });
});
