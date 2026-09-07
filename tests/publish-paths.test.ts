import { describe, expect, it } from 'vitest';
import { classifyPostPaths } from '../scripts/validate-post.mjs';

describe('publication paths', () => {
  it('classifies only matched production and fixture root pairs', () => {
    expect(classifyPostPaths('src/content/posts/a.md', 'public/images/posts/a.png')).toBe('production');
    expect(classifyPostPaths('tests/fixtures/posts/a.md', 'tests/fixtures/public/images/posts/a.png')).toBe('fixture');
  });

  it('rejects paths outside or across the approved root pairs', () => {
    expect(() => classifyPostPaths('src/content/posts/a.md', 'tests/fixtures/public/images/posts/a.png')).toThrow('matching approved roots');
    expect(() => classifyPostPaths('notes/a.md', 'public/images/posts/a.png')).toThrow('matching approved roots');
  });
});
