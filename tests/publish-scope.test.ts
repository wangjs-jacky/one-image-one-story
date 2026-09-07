import { describe, expect, it } from 'vitest';
import { expectedPaths, unexpectedChanges } from '../scripts/post-files.mjs';

describe('publish scope', () => {
  it('allows only requested files', () => {
    const allowed = expectedPaths('src/content/posts/a.md', 'public/images/posts/a.png');

    expect(unexpectedChanges(['?? src/content/posts/a.md', '?? public/images/posts/a.png'], allowed)).toEqual([]);
  });

  it('rejects unrelated work', () => {
    const allowed = expectedPaths('src/content/posts/a.md', 'public/images/posts/a.png');

    expect(unexpectedChanges([' M README.md', '?? src/content/posts/a.md'], allowed)).toEqual(['README.md']);
  });

  it('preserves leading whitespace in porcelain paths', () => {
    const allowed = expectedPaths(' src/content/posts/a.md', 'public/images/posts/a.png');

    expect(unexpectedChanges(['??  src/content/posts/a.md'], allowed)).toEqual([]);
  });
});
