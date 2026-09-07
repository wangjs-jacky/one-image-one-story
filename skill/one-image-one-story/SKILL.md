---
name: one-image-one-story
description: "Use when the user wants 一图一故事 / One Image, One Story from a topic, pasted text, or URL, with a pure visual illustration and separate short Chinese copy for the gallery."
---

# One Image, One Story

Turn one supported claim into one pure image and one independent Chinese story. Preserve the requested stopping point: a draft-only request ends before generation or publication as specified.

## Workflow

1. **Classify input:** `topic` = a subject or idea; `text` = supplied prose; `url` = a web source to acquire. For mixed input, classify the source actually used. Locate the repository by resolving this installed Skill's symlink: its canonical `skill/one-image-one-story/` directory is two levels below the repository root. Read its content schema and `publish:post` interface; inspect worktree status without changing files.
2. **Acquire evidence:** for a topic, research factual claims when needed; for text, use only supplied facts and clearly separate interpretation. For public URLs use the environment's research route (`dev-tools:web-search` here). For authenticated or dynamic pages use the permitted browser route (Ego Browser only here). Read the actual body; capture the public source URL and verifiable facts. Failed, incomplete, or inaccessible acquisition stops the workflow—do not invent missing facts or silently substitute another source.
3. **Apply the source/privacy gate before repository mutation:** access to a logged-in page does not authorize public derivative publication. If the source is private, sensitive, confidential, or its public reuse authorization is unclear, stop and report the specific missing authorization or necessary redaction. Resume only when session evidence establishes permission for this public derivative and sensitive details have been removed. Reuse existing scoped authorization; do not ask again when it already resolves the issue. Never put credentials, private source excerpts, or token-bearing URLs in repository files, commit messages, or image-generation prompts.
4. **Distill and draft:** select one claim grounded in the evidence and one visual metaphor. Read [content-contract.md](references/content-contract.md) for the Markdown fields, source attribution, 150–300 Chinese-character body, and slug/path mapping. Keep factual uncertainty explicit; omit unverified numbers, dates, authors, and quotes. Draft outside the repository until the source/privacy gate passes.
5. **Generate:** read [brand-system.md](references/brand-system.md), then use the installed image-generation capability (`imagegen` here). Produce a **1600×2000 PNG**, 4:5, with a single focal metaphor and the stable brand system. The image contains **no text, letters, numbers, labels, logos, or watermarks**; even a verified short title belongs only in the separate copy.
6. **Inspect and write:** open the generated image and check metaphor, composition, brand consistency, and absence of words/logos. Verify the actual PNG format and exact pixel dimensions. If correction is needed, use the permitted image workflow and re-inspect; never stretch an image. Only after these checks write the Markdown and PNG to their contract paths. Avoid existing slug/path collisions and preserve unrelated work.
7. **Validate and publish:** from the repository root run the commands below with the actual slug and a concise, non-sensitive commit message. Publication requires the user's request or existing session authorization to include publishing. `publish:post` owns tests, fixture checks, build, scoped staging, commit, push, and Pages completion. Do not bypass a failed check or manually push around the publisher's guards.

```bash
npm run validate:post -- --post src/content/posts/example-story.md --image public/images/posts/example-story.png
npm run publish:post -- --post src/content/posts/example-story.md --image public/images/posts/example-story.png --message 'content: publish example story'
```

8. **Report:** preserve the publisher's final JSON (`commit`, `homeUrl`, `postUrl`) and return it with the actual Markdown and PNG paths. Verify the returned public links and image; actual page interaction uses Ego. A failed publisher or unreachable live page is an explicit incomplete result, with the failing gate and recoverable local artifact paths. A dry run returns `dryRun` and `files`, not evidence of publication.

## Installation

Run `bash scripts/install.sh` from this Skill directory. It installs a symlink into `${CODEX_HOME}/skills` when set, otherwise the current user's `.codex/skills`, and refuses to replace real files or directories. Refresh installation from the retained checkout before removing an implementation worktree.
