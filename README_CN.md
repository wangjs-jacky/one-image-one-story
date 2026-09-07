# 一图一文 · One Image, One Story

[English](README.md)

以一张纯配图和一篇独立短文表达一个观点。站点基于 Astro、Markdown 和 PNG，每次推送到 `main` 后通过 GitHub Actions 部署到 GitHub Pages，提供响应式画廊、作品永久链接、来源说明、复制链接和分享元数据。

空内容集合也能正常构建和展示首页。目前提供站点与发布基础；可复用生成 Skill 和首发作品按后续计划交付。

## 本地运行与检查

需要当前 Node.js 22（22.18+，支持直接加载 TypeScript）、npm、Git；发布还需要已登录的 GitHub CLI。

```bash
npm ci
npm run dev
```

完整本地验收命令：

```bash
npm run check && npm run build && npm test -- --run
```

`check` 将测试内容隔离构建到 `.fixture-build/dist`，运行 Astro 类型检查及测试；`build` 将生产内容构建到 `dist/`。测试样例不会进入生产站点。本地验证项目子路径时可设置 `SITE_URL` 和 `BASE_PATH`；Pages 工作流会根据仓库自动设置。

## 三种输入模式

- 主题：从一句主题提炼一个核心观点。
- 文章文本：提炼可独立阅读的观点，不逐段改写原文。
- 网页 URL：先读取并核实正文，保留来源链接；读取失败、正文为空或缺乏证据时停止。

生成流程的目标产物是一篇正文含 150–300 个汉字的短文和一张 1600×2000 PNG 纯配图。文字独立于图片；图片不包含标题、正文、Logo、水印或乱码。具体生成与安装步骤见下方 Skill 计划。

## 文件与数据契约

正文保存到 `src/content/posts/<slug>.md`，图片保存到 `public/images/posts/<slug>.png`。Markdown 使用以下 frontmatter，之后接正文：

```yaml
---
title: "一个简短标题"
slug: example-story
publishedAt: "2026-09-08T12:00:00+08:00"
summary: "可以独立理解的短摘要"
image: /images/posts/example-story.png
imageAlt: "描述配图内容的替代文本"
tags: [设计]
sourceType: topic
sourceUrl: null
status: published
---
```

frontmatter 只接受 YAML，开头为 `---`、`---yaml` 或 `---yml`；当前文章和同目录文章中的可执行语言、自定义语言都会被拒绝。标题 1–80 字符，摘要 1–120 字符，替代文本 1–160 字符，标签为 1–8 个非空字符串。`slug` 全局唯一，只允许小写英文、数字及分隔用的短横线。时间必须是带时区且加引号的 ISO 字符串。`sourceType` 为 `topic`、`text` 或 `url`；URL 模式必须提供合法 `sourceUrl`，所有非空来源链接只允许 HTTP 或 HTTPS。`status` 固定为 `published`。图片引用必须与实际传入路径一致，格式和尺寸必须为 PNG、1600×2000。以 [schema](src/lib/post-schema.ts) 和 [文件校验器](scripts/validate-post.mjs) 为准。

## 自动发布与停止条件

```bash
npm run validate:post -- --post src/content/posts/example-story.md --image public/images/posts/example-story.png
npm run publish:post -- --post src/content/posts/example-story.md --image public/images/posts/example-story.png --message "content: publish example story" --dry-run
npm run publish:post -- --post src/content/posts/example-story.md --image public/images/posts/example-story.png --message "content: publish example story"
```

`--dry-run` 执行校验和构建检查，不连接远端，也不暂存、提交或推送。正式发布只接受生产目录中的文件对；执行内容校验、测试和强制生产构建后，拒绝无关工作区修改。暂存前读取 `origin` 唯一推送目标的 `main`，要求本地 `HEAD` 与该提交完全一致；代码发布及未同步历史必须另行处理。随后只暂存这两个文件，创建提交并核对提交文件和唯一父提交，使用固定新 SHA 与要求原远端基线不变的显式 lease 推送。远端前进或回退都会拒绝推送并保留本地提交。之后按工作流文件名 `deploy-pages.yml`、新提交 SHA、`main` 分支和 `push` 事件精确等待部署，返回提交、首页和作品链接。

写入内容前必须检查来源和隐私。遇到密钥、私人对话、内部文档、个人身份信息、未授权素材、无法获取的来源或不足以支撑观点的证据时停止。图片失败或不合格、schema 不合法、slug 重复、测试或构建失败、存在无关修改时，也必须停止。脚本中的敏感值模式匹配只是补充防线，不能替代隐私判断和图片目视检查。发布脚本不单独请求返回的网址，报告上线前仍须检查 HTTP 成功响应。

## Pages 地址发现与失败恢复

部署入口固定为 [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)，响应 `main` 推送及手动触发。仓库 Pages 设置须为 GitHub Actions（`build_type: workflow`）。成功部署后从 API 获取真实网址：

```bash
gh api repos/{owner}/{repo}/pages --jq .html_url
```

线上首页：[wangjs-jacky.github.io/one-image-one-story](https://wangjs-jacky.github.io/one-image-one-story/)。作品地址为 `<首页网址>posts/<slug>/`。

如果本地提交成功但推送失败，保留脚本报告的 SHA，对照当前远端 `main` 检查提交历史，单独处理权限或历史同步。不要重复生成文章、在存在未推送提交时重跑内容发布，也不要强制推送。确认全部待推送历史符合预期后，才通过 `git push origin COMMIT_SHA:main` 推送已审核的固定提交。将下方 `COMMIT_SHA` 替换为实际值查询部署：

```bash
gh run list --workflow deploy-pages.yml --commit COMMIT_SHA --branch main --event push
gh run view RUN_ID --log-failed
gh run watch RUN_ID --exit-status
```

临时部署故障可通过 `gh run rerun RUN_ID --failed` 重跑失败任务；代码缺陷应在同一历史上修复、通过完整检查并推送新提交。工作流成功后检查 API 返回的首页及新作品链接是否 HTTP 成功。失败时报告失败阶段和运行链接，不把本地提交当作上线成功。

## 设计与实施计划

- [设计说明](docs/superpowers/specs/2026-09-08-one-image-one-story-design.md)
- [站点实施计划](docs/superpowers/plans/2026-09-08-one-image-one-story-site.md)
- [Skill 与首发内容计划](docs/superpowers/plans/2026-09-08-one-image-one-story-skill-and-content.md)
