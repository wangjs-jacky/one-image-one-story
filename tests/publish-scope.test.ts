import { describe, expect, it } from 'vitest';
import { expectedPaths, porcelainStatusLines, unexpectedChanges } from '../scripts/post-files.mjs';

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

  it('keeps every untracked file and both sides of renames from raw porcelain output', () => {
    const allowed = expectedPaths('src/content/posts/new/a.md', 'public/images/posts/new/a.png');
    const lines = porcelainStatusLines('?? src/content/posts/new/a.md\0?? public/images/posts/new/a.png\0?? notes.txt\0R  src/content/posts/new/a.md\0src/content/posts/old/a.md\0');

    expect(unexpectedChanges(lines, allowed)).toEqual(['notes.txt', 'src/content/posts/old/a.md']);
  });
});
