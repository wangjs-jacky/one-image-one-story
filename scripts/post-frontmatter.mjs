import matter from 'gray-matter';

export const parsePostMarkdown = (markdown, postPath) => {
  // gray-matter strips a BOM and lets the first delimiter select an engine,
  // including JavaScript's eval. Validate that line before calling it at all.
  const source = markdown.replace(/^\uFEFF/, '');
  const opening = source.split(/\r?\n/, 1)[0];
  if (!/^---(?:[\t ]*(?:yaml|yml))?[\t ]*$/.test(opening)) {
    throw new Error(`YAML-only frontmatter required in ${postPath}: use ---, ---yaml, or ---yml; executable and custom languages are not allowed`);
  }

  try {
    // Normalize accepted YAML aliases so no input can choose another engine.
    return matter(`---${source.slice(opening.length)}`, { language: 'yaml' });
  } catch (error) {
    throw new Error(`Post frontmatter is invalid YAML in ${postPath}: ${error.message}`);
  }
};
