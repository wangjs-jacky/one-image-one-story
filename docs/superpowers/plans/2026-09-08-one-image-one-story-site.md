# One Image, One Story Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish the Astro gallery, permanent post pages, content validation, and safe GitHub-based deployment foundation.

**Architecture:** Markdown is the source of truth, validated by one shared Zod schema and rendered by Astro into a masonry index and static post routes. A repository-owned publisher validates and builds before staging only one requested post/image pair; GitHub Actions deploys accepted `main` pushes to Pages.

**Tech Stack:** Node.js 22, Astro 5, TypeScript 5, Zod 3, Vitest 3, GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-09-08-one-image-one-story-design.md`

## Global Constraints

- Public repository name: `one-image-one-story`.
- Each post has one standalone 1600×2000 PNG with no embedded words, logo, watermark, or imitation trademark.
- Production copy is independent Chinese prose between 150 and 300 Chinese characters.
- Homepage is responsive masonry; each post has a permanent static route and Open Graph metadata.
- Normal publication automatically pushes and waits for Pages verification.
- Sensitive input, invalid content, unrelated worktree changes, test failure, or build failure stops before commit and push.
- No accounts, database, comments, likes, analytics, online editor, scheduler, multilingual system, or custom domain in v1.

## File Map

- `package.json`: scripts and dependencies.
- `astro.config.mjs`: local and Pages URLs.
- `src/lib/post-schema.ts`: canonical frontmatter validation.
- `src/content.config.ts`: Astro collection.
- `src/layouts/BaseLayout.astro`: metadata and shell.
- `src/components/PostCard.astro`: gallery card.
- `src/pages/index.astro`: masonry homepage.
- `src/pages/posts/[...slug].astro`: permanent pages.
- `src/styles/global.css`: brand tokens and responsive layout.
- `scripts/validate-post.mjs`: post/image validation.
- `scripts/publish-post.mjs`: scoped auto-publication.
- `tests/`: schema, scope, and static-output tests.
- `.github/workflows/deploy-pages.yml`: Pages CI/CD.
- `README.md`, `README_CN.md`: bilingual documentation.

---

### Task 1: Astro Foundation and Canonical Schema

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/lib/post-schema.ts`
- Create: `src/content.config.ts`
- Create: `src/content/posts/.gitkeep`
- Test: `tests/post-schema.test.ts`

**Interfaces:**
- Produces: `PostFrontmatter`.
- Produces: `validatePostFrontmatter(value: unknown): PostFrontmatter`.
- Produces: Astro collection `posts` using the same schema.

- [ ] **Step 1: Write the failing schema tests**

```ts
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
});
```

- [ ] **Step 2: Verify the test fails before implementation**

Run: `npm test -- --run tests/post-schema.test.ts`
Expected: FAIL because the package and schema do not exist.

- [ ] **Step 3: Create `package.json` and install**

```json
{
  "name": "one-image-one-story",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "check": "astro check && vitest run",
    "test": "vitest",
    "validate:post": "node scripts/validate-post.mjs",
    "publish:post": "node scripts/publish-post.mjs"
  },
  "dependencies": {
    "astro": "^5.13.5",
    "gray-matter": "^4.0.3",
    "image-size": "^2.0.2",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.4",
    "typescript": "^5.9.2",
    "vitest": "^3.2.4"
  }
}
```

Run: `npm install`

- [ ] **Step 4: Implement the shared schema and Astro collection**

```ts
// src/lib/post-schema.ts
import { z } from 'zod';

export const postFrontmatterSchema = z.object({
  title: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  publishedAt: z.string().datetime({ offset: true }),
  summary: z.string().min(1).max(120),
  image: z.string().regex(/^\/images\/posts\/[a-z0-9-]+\.png$/),
  imageAlt: z.string().min(1).max(160),
  tags: z.array(z.string().min(1)).min(1).max(8),
  sourceType: z.enum(['topic', 'text', 'url']),
  sourceUrl: z.string().url().nullable(),
  status: z.literal('published'),
}).superRefine((value, context) => {
  if (value.sourceType === 'url' && value.sourceUrl === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['sourceUrl'], message: 'URL input requires sourceUrl' });
  }
});
export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;
export const validatePostFrontmatter = (value: unknown): PostFrontmatter => postFrontmatterSchema.parse(value);
```

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { postFrontmatterSchema } from './lib/post-schema';
const posts = defineCollection({ loader: glob({ base: process.env.POSTS_DIR ?? './src/content/posts', pattern: '**/*.{md,mdx}' }), schema: postFrontmatterSchema });
export const collections = { posts };
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
export default defineConfig({ site: process.env.SITE_URL ?? 'http://localhost:4321', base: process.env.BASE_PATH ?? '/', output: 'static' });
```

```json
{ "extends": "astro/tsconfigs/strict" }
```

- [ ] **Step 5: Verify schema and types**

Run: `npm test -- --run tests/post-schema.test.ts && npx astro check`
Expected: PASS with no type errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json src tests/post-schema.test.ts
git commit -m "feat: add Astro content schema"
```

---

### Task 2: Masonry Homepage and Permanent Pages

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/PostCard.astro`
- Create: `src/pages/index.astro`
- Create: `src/pages/posts/[...slug].astro`
- Create: `src/styles/global.css`
- Create: `tests/fixtures/posts/sample.md`
- Test: `tests/site-output.test.mjs`

**Interfaces:**
- Consumes: `posts` collection entries.
- Produces: `/`, `/posts/{slug}/`, canonical metadata, Open Graph metadata, and copy-link UI.

- [ ] **Step 1: Write the failing static-output test**

```js
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
```

- [ ] **Step 2: Verify failure**

Run: `npm run build && npm test -- --run tests/site-output.test.mjs`
Expected: FAIL because layouts and pages do not exist.

- [ ] **Step 3: Implement `BaseLayout.astro`**

```astro
---
import '../styles/global.css';
const { title, description, image, canonical = new URL(Astro.url.pathname, Astro.site) } = Astro.props;
const imageUrl = image ? new URL(`${import.meta.env.BASE_URL}${image.slice(1)}`, Astro.site) : undefined;
---
<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width" />
<title>{title}</title><meta name="description" content={description} />
<link rel="canonical" href={canonical} /><meta property="og:title" content={title} />
<meta property="og:description" content={description} />{imageUrl && <meta property="og:image" content={imageUrl} />}
</head><body><header><a href={import.meta.env.BASE_URL}>一图一文</a></header><main><slot /></main></body></html>
```

- [ ] **Step 4: Implement cards and routes**

`PostCard.astro` must render `data-post-card`, a fixed-ratio image, title, summary, date, and tags. `index.astro` loads `posts`, sorts descending by `publishedAt`, and renders the responsive masonry. `[...slug].astro` implements `getStaticPaths`, renders the large image, title, Markdown body, optional source URL, tags, and a `data-copy-link` button that copies `location.href`.

```ts
export async function getStaticPaths() {
  return (await getCollection('posts')).map((post) => ({ params: { slug: post.data.slug }, props: { post } }));
}
```

- [ ] **Step 5: Implement the brand CSS**

```css
:root { --paper:#f3efe5; --ink:#171713; --muted:#6e6a61; --accent:#e6502e; --line:rgba(23,23,19,.16); }
* { box-sizing:border-box; }
body { margin:0; color:var(--ink); background:var(--paper); font-family:Inter,"PingFang SC",sans-serif; }
main,header { width:min(1240px,calc(100% - 32px)); margin-inline:auto; }
.masonry { columns:3 280px; column-gap:24px; }
.post-card { break-inside:avoid; margin-bottom:32px; border-bottom:1px solid var(--line); }
.post-card img,.post-detail img { display:block; width:100%; height:auto; }
.post-detail { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr); gap:48px; }
@media (max-width:720px) { .masonry{columns:1}.post-detail{grid-template-columns:1fr;gap:24px} }
```

- [ ] **Step 6: Add a valid sample fixture and verify output**

Create `tests/fixtures/posts/sample.md` with valid frontmatter, then run `POSTS_DIR=./tests/fixtures/posts npm run build && npm test -- --run tests/site-output.test.mjs`. Expect PASS; production content remains empty.

- [ ] **Step 7: Commit**

```bash
git add src tests/site-output.test.mjs
git commit -m "feat: add masonry gallery and post pages"
```

---

### Task 3: Safe Validation and Publishing CLI

**Files:**
- Create: `scripts/post-files.mjs`
- Create: `scripts/validate-post.mjs`
- Create: `scripts/publish-post.mjs`
- Test: `tests/publish-scope.test.ts`

**Interfaces:**
- Produces: `expectedPaths(postPath, imagePath): Set<string>`.
- Produces: `unexpectedChanges(statusLines, allowed): string[]`.
- CLI: `npm run validate:post -- --post src/content/posts/figwright-free-figma-mcp.md --image public/images/posts/figwright-free-figma-mcp.png`.
- CLI: `npm run publish:post -- --post src/content/posts/figwright-free-figma-mcp.md --image public/images/posts/figwright-free-figma-mcp.png --message "content: publish Figwright story" [--dry-run]`.

- [ ] **Step 1: Write failing scope tests**

```ts
import { describe, expect, it } from 'vitest';
import { expectedPaths, unexpectedChanges } from '../scripts/post-files.mjs';
describe('publish scope', () => {
  it('allows only requested files', () => {
    const allowed = expectedPaths('src/content/posts/a.md','public/images/posts/a.png');
    expect(unexpectedChanges(['?? src/content/posts/a.md','?? public/images/posts/a.png'],allowed)).toEqual([]);
  });
  it('rejects unrelated work', () => {
    const allowed = expectedPaths('src/content/posts/a.md','public/images/posts/a.png');
    expect(unexpectedChanges([' M README.md','?? src/content/posts/a.md'],allowed)).toEqual(['README.md']);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- --run tests/publish-scope.test.ts`
Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement status parsing**

```js
import path from 'node:path';
export const expectedPaths = (postPath,imagePath) => new Set([path.normalize(postPath),path.normalize(imagePath)]);
export const unexpectedChanges = (lines,allowed) => lines.filter(Boolean).map((line)=>line.slice(3).trim()).filter((file)=>!allowed.has(path.normalize(file)));
```

- [ ] **Step 4: Implement `validate-post.mjs`**

Parse arguments, read YAML with `gray-matter`, call `validatePostFrontmatter`, count the Markdown body as 150–300 Chinese characters, resolve and compare the declared image path, verify PNG dimensions are exactly 1600×2000 with `image-size`, and reject duplicate slugs. Print `{slug,postPath,imagePath}` as JSON on success; exit non-zero with one actionable error on failure.

- [ ] **Step 5: Implement `publish-post.mjs`**

Run validation, `npm run check`, and `npm run build`; reject `unexpectedChanges`; stage exactly the requested Markdown and PNG; commit; push `main`; locate the Pages workflow for the new SHA; wait with `gh run watch --exit-status`; print `{commit,homeUrl,postUrl}`. `--dry-run` stops before `git add`.

```js
if (dryRun) {
  process.stdout.write(`${JSON.stringify({ dryRun:true, files:[...allowed] })}\n`);
  process.exit(0);
}
```

- [ ] **Step 6: Verify tests and dry-run**

Run: `npm test -- --run tests/publish-scope.test.ts` and a fixture-backed `npm run publish:post ... --dry-run`.
Expected: PASS; only requested paths are printed; no commit is created.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts tests/publish-scope.test.ts
git commit -m "feat: add safe post publisher"
```

---

### Task 4: GitHub Pages and Public Remote

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Create: `README.md`
- Create: `README_CN.md`

**Interfaces:**
- Consumes: successful push to `main`.
- Produces: public repository, Pages URL, and deployed static site.

- [ ] **Step 1: Add the Pages workflow**

```yaml
name: Deploy Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run check
      - run: npm run build
        env:
          SITE_URL: https://${{ github.repository_owner }}.github.io
          BASE_PATH: /${{ github.event.repository.name }}
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Write bilingual documentation**

`README.md` is English-first and links to `README_CN.md`. The Chinese README documents input modes, auto-publish safety stops, commands, schema, Pages URL discovery, and push/workflow recovery. Both link to the spec and plans.

- [ ] **Step 3: Run the complete local gate**

Run: `npm run check && npm run build && npm test -- --run`
Expected: PASS; an empty production collection renders a valid homepage.

- [ ] **Step 4: Commit deployment files**

```bash
git add .github README.md README_CN.md
git commit -m "ci: deploy gallery to GitHub Pages"
```

- [ ] **Step 5: Create and push the public repository**

```bash
gh auth status
gh repo create one-image-one-story --public --source=. --push --description "自动生成、发布和分享一图一文的 Astro 画廊"
gh repo edit --add-topic astro --add-topic github-pages --add-topic ai-art --add-topic content-publishing
```

- [ ] **Step 6: Enable and verify workflow-based Pages**

Resolve the owner with `gh api user --jq .login`, enable Pages with `build_type=workflow` if needed, watch `deploy-pages.yml`, then verify the repository API returns a Pages URL that responds successfully.

- [ ] **Step 7: Record the real URL and verify the follow-up deployment**

Update both READMEs with the returned URL, run the local gate, commit, push, wait for Pages, and confirm the worktree is clean.
