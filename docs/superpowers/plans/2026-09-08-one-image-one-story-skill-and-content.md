# One Image, One Story Skill and Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the reusable Skill, generate the Figwright sample and recommendation article, auto-publish both, and verify the complete user-facing loop.

**Architecture:** The canonical Skill lives inside the public repository and is installed into the personal Codex Skills directory by symlink. It turns topic/text/URL input into a validated Markdown/PNG pair and delegates mutation and deployment mechanics to the repository publisher built by the site plan.

**Tech Stack:** Codex Skills, imagegen, Markdown, Node.js 22, Astro 5, Git, GitHub CLI, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-09-08-one-image-one-story-design.md`

## Global Constraints

- Start only after `2026-09-08-one-image-one-story-site.md` passes and the empty Pages shell is live.
- Skill and folder name: `one-image-one-story`.
- Canonical source: `skill/one-image-one-story/`; installed path is a symlink in the active Codex Skills directory.
- Inputs: topic, pasted article text, or URL.
- Output: one 1600×2000 pure visual PNG plus one independent 150–300 Chinese-character story.
- Auto-publish only after source, privacy, schema, image, tests, and build checks pass.
- First posts: Figwright sample and the visual/content recommendation article.

## File Map

- `skill/one-image-one-story/SKILL.md`: trigger boundary and workflow.
- `skill/one-image-one-story/agents/openai.yaml`: UI metadata.
- `skill/one-image-one-story/references/brand-system.md`: image direction.
- `skill/one-image-one-story/references/content-contract.md`: source and copy contract.
- `skill/one-image-one-story/scripts/install.sh`: safe symlink installer.
- `tests/skill-contract.test.mjs`: Skill contract test.
- `src/content/posts/figwright-free-figma-mcp.md`: first story.
- `public/images/posts/figwright-free-figma-mcp.png`: first image.
- `src/content/posts/one-image-one-story-recommendation.md`: recommendation story.
- `public/images/posts/one-image-one-story-recommendation.png`: recommendation image.

---

### Task 1: Create and Install the Reusable Skill

**Files:**
- Create: `skill/one-image-one-story/SKILL.md`
- Create: `skill/one-image-one-story/agents/openai.yaml`
- Create: `skill/one-image-one-story/references/brand-system.md`
- Create: `skill/one-image-one-story/references/content-contract.md`
- Create: `skill/one-image-one-story/scripts/install.sh`
- Test: `tests/skill-contract.test.mjs`

**Interfaces:**
- Consumes: user input classified as `topic`, `text`, or `url`.
- Consumes: repository `publish:post` CLI.
- Produces: one post Markdown path, one PNG path, and publisher JSON.

- [ ] **Step 1: Read creation guidance and initialize**

Read `skill-creator` and `superpowers:writing-skills` completely. Run the bundled initializer with `references` and `scripts` resources to create `skill/one-image-one-story`; remove every generated placeholder before validation.

- [ ] **Step 2: Write the failing Skill contract test**

```js
import { readFile, lstat } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
describe('one-image-one-story skill', () => {
  it('declares three inputs and the safe publish gate', async () => {
    const text = await readFile('skill/one-image-one-story/SKILL.md','utf8');
    expect(text).toMatch(/topic.*text.*url/is);
    expect(text).toContain('1600×2000');
    expect(text).toContain('publish:post');
    expect(text).toMatch(/敏感|private|sensitive/i);
  });
  it('installs as a symlink', async () => {
    const path = process.env.INSTALLED_SKILL_PATH;
    if (path) expect((await lstat(path)).isSymbolicLink()).toBe(true);
  });
});
```

- [ ] **Step 3: Verify failure**

Run: `npm test -- --run tests/skill-contract.test.mjs`
Expected: FAIL because Skill files do not exist.

- [ ] **Step 4: Write focused `SKILL.md` orchestration**

The body must encode this flow and delegate build/push details to repository scripts:

```text
classify input → acquire evidence → privacy/source gate → distill one claim →
draft structured content → generate 1600×2000 pure image → visual/file check →
write Markdown and PNG → run publish:post → report live links
```

Public URLs use the environment's research route; authenticated or dynamic pages use the permitted browser route. Failed acquisition must stop. Image generation must use the installed image-generation capability and the brand reference. Likely private or sensitive content must stop before repository mutation.

- [ ] **Step 5: Write content and brand references**

`content-contract.md` defines title, summary, 150–300 Chinese-character body, alt text, tags, source fields, and slug mapping. `brand-system.md` defines warm paper, deep ink, one vivid accent, editorial still life, studio light, refined materials, strong focal object, topic-aware props, and no embedded words.

```text
Create a 4:5 editorial still-life illustration at 1600×2000. Communicate one visual metaphor.
Warm paper-toned environment, deep ink shadows, one vivid accent, precise contemporary materials,
calm studio lighting, generous negative space, tactile detail. Adapt objects and accent hue to the topic.
No text, letters, UI labels, logos, watermarks, trademarks, signatures, captions, or poster typography.
```

- [ ] **Step 6: Implement safe idempotent installation**

`install.sh` resolves repository-relative source, selects `${CODEX_HOME}/skills` when set and otherwise `.codex/skills` under the current user directory, refuses to overwrite a real directory, and updates only symlinks.

- [ ] **Step 7: Validate, install, and test**

Run bundled `skill-creator/scripts/quick_validate.py`, then:

```bash
bash skill/one-image-one-story/scripts/install.sh
INSTALLED_SKILL_PATH="/Users/jacky/.codex/skills/one-image-one-story" npm test -- --run tests/skill-contract.test.mjs
```

Expected: validator PASS; contract tests PASS; installed path is a symlink to repository source.

- [ ] **Step 8: Commit**

```bash
git add skill tests/skill-contract.test.mjs
git commit -m "feat: add one-image-one-story skill"
```

---

### Task 2: Generate the Figwright Production Sample

**Files:**
- Create: `src/content/posts/figwright-free-figma-mcp.md`
- Create: `public/images/posts/figwright-free-figma-mcp.png`

**Interfaces:**
- Consumes: extracted Figwright evidence and source URL.
- Produces: validated slug `figwright-free-figma-mcp`.

- [ ] **Step 1: Draft from the single approved claim**

Claim: Figwright changes Figma-to-code from one-way export into a bidirectional design conversation. Write 150–300 Chinese characters and complete frontmatter using the site schema.

- [ ] **Step 2: Generate the pure visual image**

Use imagegen with:

```text
Create a 4:5 editorial still-life illustration at 1600×2000. Show a precise physical bridge joining
two work surfaces: one side holds modular translucent layout frames and color/material swatches,
the other holds elegant abstract code-like mechanical structures without readable symbols.
Signals move in both directions. Warm paper studio, deep ink shadows, electric violet accent,
refined glass and anodized metal, calm directional light, generous negative space, tactile detail.
No text, letters, numbers, UI labels, logos, watermarks, trademarks, signatures, or captions.
```

- [ ] **Step 3: Inspect and normalize the image**

Visually verify topic relevance and absence of text/logos. Verify PNG format and 4:5 composition; resize or crop to exactly 1600×2000 without stretching only when needed.

- [ ] **Step 4: Run the local production gate**

```bash
npm run validate:post -- --post src/content/posts/figwright-free-figma-mcp.md --image public/images/posts/figwright-free-figma-mcp.png
npm run check
npm run build
```

Expected: PASS; `dist/posts/figwright-free-figma-mcp/index.html` exists.

- [ ] **Step 5: Auto-publish the Figwright pair**

```bash
npm run publish:post -- \
  --post src/content/posts/figwright-free-figma-mcp.md \
  --image public/images/posts/figwright-free-figma-mcp.png \
  --message "content: publish Figwright story"
```

---

### Task 3: Generate the Recommendation Article

**Files:**
- Create: `src/content/posts/one-image-one-story-recommendation.md`
- Create: `public/images/posts/one-image-one-story-recommendation.png`

**Interfaces:**
- Consumes: approved design spec and observed sample.
- Produces: a user-checkable explanation of visual, copy, site, and publication choices.

- [ ] **Step 1: Write the recommendation story**

The 150–300 character body explains: pure image plus separate copy, consistent brand with topic-aware variation, 4:5 composition, portable Markdown, permanent routes, and automatic publication guarded by validation.

- [ ] **Step 2: Generate the recommendation image**

```text
Create a 4:5 editorial still-life illustration at 1600×2000. Show a curated publishing desk where
one pristine image print and one separate text manuscript travel through a precise mechanical archive
into a small illuminated public gallery. Warm paper environment, deep ink shadows, vermilion accent,
refined brass and glass, calm studio light, generous negative space, tactile editorial detail.
No text, letters, numbers, UI labels, logos, watermarks, trademarks, signatures, or captions.
```

- [ ] **Step 3: Inspect and run the production gate**

Verify the image as in Task 2, then run `validate:post`, `check`, and `build`.
Expected: PASS; both permanent routes exist under `dist/posts/`.

- [ ] **Step 4: Auto-publish the recommendation pair**

```bash
npm run publish:post -- \
  --post src/content/posts/one-image-one-story-recommendation.md \
  --image public/images/posts/one-image-one-story-recommendation.png \
  --message "content: publish recommendation story"
```

---

### Task 4: Publish and Verify the Complete Loop

**Files:**
- Modify only the owner file of any verified defect.

**Interfaces:**
- Consumes: two committed post/image pairs and public remote.
- Produces: successful Pages deployment, gallery, two permanent URLs, and verification evidence.

- [ ] **Step 1: Confirm both automatic deployments**

```bash
gh run list --workflow deploy-pages.yml --limit 3
gh run view --json headSha,status,conclusion,url
```

Expected: the two publisher invocations created separate commits and each corresponding workflow succeeded.

- [ ] **Step 2: Verify URLs and metadata**

Fetch the actual homepage and both permanent URLs. Confirm successful responses, both homepage cards, unique canonicals, and resolvable `og:image` URLs.

- [ ] **Step 3: Verify desktop and mobile UX**

Use Ego Browser on the live site. Verify desktop masonry, both permanent pages, copy-link behavior, a mobile viewport, and current screenshots. Report every meaningful verified browser round to Happy with one run ID.

- [ ] **Step 4: Smoke-test the installed Skill without a third publication**

Invoke it with a throwaway topic and an explicit instruction to stop after structured draft and image-prompt generation. Confirm topic classification, content contract, brand reference, and no repository mutation.

- [ ] **Step 5: Run the final gate**

```bash
npm run check
npm run build
npm test -- --run
git status --short
gh repo view
gh run list --workflow deploy-pages.yml --limit 1
```

Expected: all checks PASS; clean worktree; public remote; successful latest workflow.

- [ ] **Step 6: Deliver artifacts**

Return repository URL, Pages homepage, two permanent post URLs, installed Skill path, test/build results, screenshots, and the recommendation article. Explicitly state whether the user must act.
