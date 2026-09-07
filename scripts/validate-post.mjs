import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { imageSize } from 'image-size';
import { validatePostFrontmatter } from '../src/lib/post-schema.ts';

const repositoryRoot = process.cwd();
const chineseCharacter = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/gu;

const fail = (message) => {
  throw new Error(message);
};

const parseArgs = (args) => {
  const values = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== '--post' && argument !== '--image') fail(`Unknown argument: ${argument}`);
    if (values[argument]) fail(`Argument may only be provided once: ${argument}`);

    const value = args[index + 1];
    if (!value || value.startsWith('--')) fail(`Missing value for ${argument}`);
    values[argument] = value;
    index += 1;
  }

  if (!values['--post'] || !values['--image']) fail('Both --post and --image are required');
  return { postPath: values['--post'], imagePath: values['--image'] };
};

const relativePath = (input, label) => {
  if (path.isAbsolute(input)) fail(`${label} must be a repository-relative path`);

  const normalized = path.normalize(input);
  if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    fail(`${label} must stay inside the repository`);
  }

  return normalized;
};

const publicDirectoryFor = (postPath) => postPath.startsWith(`tests${path.sep}fixtures${path.sep}posts${path.sep}`)
  ? path.join('tests', 'fixtures', 'public')
  : 'public';

const declaredImagePath = (postPath, image) => path.normalize(path.join(publicDirectoryFor(postPath), image));

const countChineseCharacters = (body) => (body.match(chineseCharacter) ?? []).length;

const allPostFiles = async (postPath) => {
  const { glob } = await import('node:fs/promises');
  const files = [];
  const directory = postPath.startsWith(`tests${path.sep}fixtures${path.sep}posts${path.sep}`)
    ? path.join('tests', 'fixtures', 'posts')
    : path.join('src', 'content', 'posts');
  for await (const file of glob(path.join(directory, '**', '*.{md,mdx}'))) files.push(path.normalize(file));
  return files;
};

export const validatePost = async ({ postPath: postInput, imagePath: imageInput }) => {
  const postPath = relativePath(postInput, '--post');
  const imagePath = relativePath(imageInput, '--image');

  if (path.extname(postPath).toLowerCase() !== '.md') fail('--post must name a Markdown (.md) file');
  if (path.extname(imagePath).toLowerCase() !== '.png') fail('--image must name a PNG file');

  let markdown;
  try {
    markdown = await readFile(path.join(repositoryRoot, postPath), 'utf8');
  } catch {
    fail(`Post file does not exist: ${postPath}`);
  }

  let parsed;
  try {
    parsed = matter(markdown);
  } catch (error) {
    fail(`Post frontmatter is invalid YAML: ${error.message}`);
  }

  let frontmatter;
  try {
    frontmatter = validatePostFrontmatter(parsed.data);
  } catch (error) {
    fail(`Post frontmatter is invalid: ${error.issues?.map((issue) => issue.message).join('; ') ?? error.message}`);
  }

  const chineseCount = countChineseCharacters(parsed.content);
  if (chineseCount < 150 || chineseCount > 300) {
    fail(`Post body must contain 150–300 Chinese characters; found ${chineseCount}`);
  }

  const expectedImagePath = declaredImagePath(postPath, frontmatter.image);
  if (imagePath !== expectedImagePath) {
    fail(`--image must match frontmatter image: expected ${expectedImagePath}`);
  }

  let imageBuffer;
  try {
    imageBuffer = await readFile(path.join(repositoryRoot, imagePath));
  } catch {
    fail(`Image file does not exist: ${imagePath}`);
  }

  let dimensions;
  try {
    dimensions = imageSize(imageBuffer);
  } catch {
    fail(`Image is not a readable PNG: ${imagePath}`);
  }
  if (dimensions.type !== 'png' || dimensions.width !== 1600 || dimensions.height !== 2000) {
    fail(`Image must be a 1600×2000 PNG; found ${dimensions.width ?? '?'}×${dimensions.height ?? '?'} ${dimensions.type ?? 'unknown'}`);
  }

  const siblings = await allPostFiles(postPath);
  for (const siblingPath of siblings) {
    if (siblingPath === postPath) continue;
    const sibling = matter(await readFile(path.join(repositoryRoot, siblingPath), 'utf8'));
    if (sibling.data.slug === frontmatter.slug) fail(`Duplicate slug: ${frontmatter.slug} also exists in ${siblingPath}`);
  }

  return { slug: frontmatter.slug, postPath, imagePath };
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const result = await validatePost(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
