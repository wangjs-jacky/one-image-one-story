# One Image, One Story

[简体中文](README_CN.md)

An Astro gallery for one pure visual image and one independent short story. Markdown and PNG files are the publication source; GitHub Actions builds permanent, shareable pages on every push to `main`.

The responsive gallery includes individual story pages, source attribution, copy-link controls, and Open Graph and Twitter Card metadata. An empty content collection is a supported starting state. The reusable generation Skill and initial stories are described in the implementation plan and will follow the site foundation.

## Development

Use a current Node.js 22 release (22.18+ for native TypeScript support), npm, Git, and an authenticated GitHub CLI for publication.

```bash
npm ci
npm run dev
```

Complete local gate:

```bash
npm run check && npm run build && npm test -- --run
```

`check` builds isolated fixtures in `.fixture-build/dist`, runs Astro diagnostics, and runs the test suite. `build` produces the production site in `dist/`. Test fixtures never become production posts. Set `SITE_URL` and `BASE_PATH` when checking a deployment path locally; the Pages workflow sets both from the repository identity.

## Content and publication

The planned generation workflow accepts a topic, pasted article text, or a source URL. It distills one supported claim into 150–300 Chinese characters and creates a separate 1600×2000 PNG, without embedded text, logos, or watermarks. An unreadable URL must stop the workflow instead of producing an invented summary.

Create a pair at `src/content/posts/<slug>.md` and `public/images/posts/<slug>.png`. The Markdown frontmatter contract is:

```yaml
---
title: "A short title"
slug: example-story
publishedAt: "2026-09-08T12:00:00+08:00"
summary: "A short standalone summary"
image: /images/posts/example-story.png
imageAlt: "A description of the visual"
tags: [design]
sourceType: topic
sourceUrl: null
status: published
---
```

The body follows YAML-only frontmatter, opened with `---`, `---yaml`, or `---yml`; executable and custom frontmatter languages are rejected in both the requested post and sibling files. Titles allow 1–80 characters, summaries 1–120, alt text 1–160, and tags 1–8 nonempty strings. Slugs use lowercase letters, digits, and single hyphen separators and must be unique. `publishedAt` is a quoted ISO timestamp with timezone. `sourceType` is `topic`, `text`, or `url`; URL input requires a valid `sourceUrl`, and any non-null source URL must use HTTP or HTTPS. The declared image must match the supplied PNG exactly. [Schema source](src/lib/post-schema.ts) and [file validator](scripts/validate-post.mjs) define the executable contract.

```bash
npm run validate:post -- --post src/content/posts/example-story.md --image public/images/posts/example-story.png
npm run publish:post -- --post src/content/posts/example-story.md --image public/images/posts/example-story.png --message "content: publish example story" --dry-run
npm run publish:post -- --post src/content/posts/example-story.md --image public/images/posts/example-story.png --message "content: publish example story"
```

Live publication validates the pair, runs checks and a forced production build, and rejects unrelated worktree changes. Before staging, it reads `main` from the single configured `origin` push destination and requires local `HEAD` to equal that exact commit. Publish repository code and reconcile incoming or outgoing history separately before publishing content. The publisher stages exactly the requested pair, commits, verifies the committed paths and sole parent, then pushes that exact new SHA with an explicit lease requiring the original remote baseline. A remote advance or rollback rejects the push and preserves the local commit. It waits for the exact `deploy-pages.yml` push run on `main` with the new SHA, then prints the commit, homepage URL, and permanent post URL. `--dry-run` runs validation and checks without contacting the remote, staging, committing, or pushing.

Before writing content, stop on secrets, private conversations, internal documents, personal information, unauthorized material, or missing source evidence. Also stop on unsuitable images, invalid schema, failed tests/build, duplicate slugs, or unrelated modifications. Automated secret-pattern checks are a partial backstop; source/privacy and visual inspection remain required. The publisher does not independently fetch the returned URLs; confirm successful HTTP responses before reporting a live page.

## GitHub Pages and recovery

The workflow file is [deploy-pages.yml](.github/workflows/deploy-pages.yml). Pages must use GitHub Actions (`build_type: workflow`). Discover the authoritative site URL after deployment:

```bash
gh api repos/{owner}/{repo}/pages --jq .html_url
```

Live site: [wangjs-jacky.github.io/one-image-one-story](https://wangjs-jacky.github.io/one-image-one-story/). Story routes are `<site URL>posts/<slug>/`.

If a push fails after a commit, retain the SHA reported by the publisher and inspect it together with the current remote `main`. Resolve access problems or reconcile history as a separate recovery operation; do not regenerate the story, rerun content publication over outgoing commits, or force push. Only after reviewing the outgoing history should you push the intended SHA with `git push origin COMMIT_SHA:main`. Find its deployment by replacing `COMMIT_SHA` below with that value:

```bash
gh run list --workflow deploy-pages.yml --commit COMMIT_SHA --branch main --event push
gh run view RUN_ID --log-failed
gh run watch RUN_ID --exit-status
```

For a transient workflow failure, use `gh run rerun RUN_ID --failed`; for a code defect, fix it, rerun the local gate, and push a new commit on the same history. A successful workflow must be followed by an HTTP check of the Pages API URL and any newly published story. Preserve errors and run links when deployment is incomplete.

## Design and plans

- [Design specification](docs/superpowers/specs/2026-09-08-one-image-one-story-design.md)
- [Site implementation plan](docs/superpowers/plans/2026-09-08-one-image-one-story-site.md)
- [Skill and initial content plan](docs/superpowers/plans/2026-09-08-one-image-one-story-skill-and-content.md)
