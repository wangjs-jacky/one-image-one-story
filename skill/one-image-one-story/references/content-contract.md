# Content contract

One publication consists of one Markdown post and one pure visual PNG. The repository's `src/lib/post-schema.ts` and `scripts/validate-post.mjs` are the executable contract; read them when adapting to a changed checkout.

## Markdown fields

| Field | Required value |
| --- | --- |
| `title` | Nonempty Chinese title, at most 80 characters, expressing the single claim. |
| `slug` | Unique lowercase ASCII words or digits separated by hyphens: `^[a-z0-9]+(?:-[a-z0-9]+)*$`. |
| `publishedAt` | Quoted ISO 8601 publication timestamp with timezone, such as `2026-09-08T10:00:00+08:00`; this is not an invented source date. |
| `summary` | Nonempty standalone Chinese summary, at most 120 characters. |
| `image` | `/images/posts/<slug>.png`. |
| `imageAlt` | Concrete accessible description of the image's objects and relationship, at most 160 characters; not a repetition of the title. |
| `tags` | 1–8 nonempty topic tags. |
| `sourceType` | `topic`, `text`, or `url`, matching the evidence used. |
| `sourceUrl` | Public HTTP(S) source URL for `url` input; required and non-null in that case. Otherwise a relevant authorized public source URL or YAML `null`. Never include access tokens or a private link. |
| `status` | `published`, only for a pair that has passed the source/privacy gate and is intended for publication. |

The Markdown body contains **150–300 Chinese characters**, counted as Han characters by the validator; punctuation, Latin text, and frontmatter do not count. Write connected prose that states one claim, explains one concrete implication, and ties naturally to the visual metaphor. It must remain useful when copied without the image. Avoid turning the short story into a list of unrelated features.

Preserve original meaning through synthesis rather than copying a full source passage. Attribute a URL source through `sourceUrl`; if a specific attribution is necessary for understanding, include it naturally in the body. Do not fabricate authors, publication dates, measurements, quotes, or product capabilities. Clearly distinguish interpretation from source-supported fact. Authenticated access alone is not permission to publish a derivative: apply the Skill's privacy/source gate before storing source details or drafts in the public repository.

## Stable mapping

For a chosen slug `example-story`, the pair is:

```text
src/content/posts/example-story.md
public/images/posts/example-story.png
```

Frontmatter `image` is `/images/posts/example-story.png`; the permanent page route is `/posts/example-story/` under the site's deployment base. Check existing posts and both paths for collisions before writing; choose another meaningful slug for a new story. The files must be regular files inside those roots, not symlinks.

Use `npm run validate:post -- --post <Markdown path> --image <PNG path>` to check schema, Han character count, unique slug, path pairing, PNG format, and 1600×2000 dimensions. Visual inspection and source authorization remain separate gates. Feed the same pair to `publish:post`; report its actual JSON and URLs rather than constructing a claimed deployment result.
