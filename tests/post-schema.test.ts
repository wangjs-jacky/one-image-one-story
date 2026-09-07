import { describe, expect, it } from 'vitest';
import { validatePostFrontmatter } from '../src/lib/post-schema';

const valid = {
  title: 'Figwright：免费的 Figma MCP',
  slug: 'figwright-free-figma-mcp',
  publishedAt: '2026-09-08T09:00:00+08:00',
  summary: '连接设计画布与前端实现的双向 AI 协作工具。',
  image: '/images/posts/figwright-free-figma-mcp.png',
  imageAlt: '设计画布与代码结构之间的一座双向桥梁',
  tags: ['AI', 'Figma', 'MCP'],
  sourceType: 'url',
  sourceUrl: 'https://mp.weixin.qq.com/s/example',
  status: 'published',
};

describe('validatePostFrontmatter', () => {
  it('accepts a complete post', () => expect(validatePostFrontmatter(valid).slug).toBe(valid.slug));
  it.each(['Fig Wright', 'UPPERCASE', '../escape', '中文'])('rejects slug %s', (slug) => {
    expect(() => validatePostFrontmatter({ ...valid, slug })).toThrow();
  });
  it('requires sourceUrl for URL input', () => {
    expect(() => validatePostFrontmatter({ ...valid, sourceUrl: null })).toThrow();
  });

  it.each(['https://example.test/articles/story?ref=gallery&lang=zh', 'http://example.test/story', 'HTTPS://example.test/story'])(
    'accepts HTTP source attribution %s', (sourceUrl) => {
      expect(validatePostFrontmatter({ ...valid, sourceUrl }).sourceUrl).toBe(sourceUrl);
    },
  );

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///tmp/story.md', 'ftp://example.test/story', 'mailto:editor@example.test'])(
    'rejects unsafe source attribution %s for every input mode', (sourceUrl) => {
      for (const sourceType of ['url', 'text', 'topic']) {
        expect(() => validatePostFrontmatter({ ...valid, sourceType, sourceUrl })).toThrow(/sourceUrl must use http:\/\/ or https:\/\//);
      }
    },
  );

  it.each(['topic', 'text'])('allows %s input without source attribution', (sourceType) => {
    expect(validatePostFrontmatter({ ...valid, sourceType, sourceUrl: null }).sourceUrl).toBeNull();
  });
});
