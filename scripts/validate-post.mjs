import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { imageSize } from 'image-size';
import { validatePostFrontmatter } from '../src/lib/post-schema.ts';

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

const pathRoots = {
  production: { posts: path.join('src', 'content', 'posts'), images: path.join('public', 'images', 'posts') },
  fixture: { posts: path.join('tests', 'fixtures', 'posts'), images: path.join('tests', 'fixtures', 'public', 'images', 'posts') },
};

const isContainedBy = (filePath, root) => {
  const relative = path.relative(root, filePath);
  return Boolean(relative) && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
};

export const classifyPostPaths = (postInput, imageInput) => {
  const postPath = relativePath(postInput, '--post');
  const imagePath = relativePath(imageInput, '--image');
  for (const [kind, roots] of Object.entries(pathRoots)) {
    if (isContainedBy(postPath, roots.posts) && isContainedBy(imagePath, roots.images)) return kind;
  }
  fail('--post and --image must be inside matching approved roots');
};

const assertRegularContainedFile = async (repositoryRoot, filePath, root, label) => {
  const absoluteFile = path.resolve(repositoryRoot, filePath);
  const absoluteRoot = path.resolve(repositoryRoot, root);
  let metadata;
  try {
    metadata = await lstat(absoluteFile);
  } catch {
    fail(`${label} file does not exist: ${filePath}`);
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) fail(`${label} must be a regular non-symlink file: ${filePath}`);

  const [canonicalFile, canonicalRoot, canonicalRepositoryRoot] = await Promise.all([
    realpath(absoluteFile),
    realpath(absoluteRoot),
    realpath(repositoryRoot),
  ]);
  if (!isContainedBy(canonicalRoot, canonicalRepositoryRoot)) {
    fail(`Approved root resolves outside the repository: ${root}`);
  }
  if (!isContainedBy(canonicalFile, canonicalRoot)) fail(`${label} resolves outside its approved root: ${filePath}`);
  return absoluteFile;
};

const declaredImagePath = (kind, image) => path.normalize(path.join(pathRoots[kind].images, '..', '..', image));

const countChineseCharacters = (body) => (body.match(chineseCharacter) ?? []).length;

const allPostFiles = async (kind, repositoryRoot) => {
  const { glob } = await import('node:fs/promises');
  const files = [];
  const directory = pathRoots[kind].posts;
  for await (const file of glob(path.join(directory, '**', '*.{md,mdx}'), { cwd: repositoryRoot })) files.push(path.normalize(file));
  return files;
};

export const validatePost = async ({ postPath: postInput, imagePath: imageInput }, { repositoryRoot = process.cwd() } = {}) => {
  const resolvedRepositoryRoot = path.resolve(repositoryRoot);
  const postPath = relativePath(postInput, '--post');
  const imagePath = relativePath(imageInput, '--image');
  const kind = classifyPostPaths(postPath, imagePath);

  if (path.extname(postPath).toLowerCase() !== '.md') fail('--post must name a Markdown (.md) file');
  if (path.extname(imagePath).toLowerCase() !== '.png') fail('--image must name a PNG file');

  const postFile = await assertRegularContainedFile(resolvedRepositoryRoot, postPath, pathRoots[kind].posts, 'Post');
  const imageFile = await assertRegularContainedFile(resolvedRepositoryRoot, imagePath, pathRoots[kind].images, 'Image');
  let markdown;
  try {
    markdown = await readFile(postFile, 'utf8');
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

  const expectedImagePath = declaredImagePath(kind, frontmatter.image);
  if (imagePath !== expectedImagePath) {
    fail(`--image must match frontmatter image: expected ${expectedImagePath}`);
  }

  let imageBuffer;
  try {
    imageBuffer = await readFile(imageFile);
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

  const siblings = await allPostFiles(kind, resolvedRepositoryRoot);
  for (const siblingPath of siblings) {
    if (siblingPath === postPath) continue;
    const sibling = matter(await readFile(path.join(resolvedRepositoryRoot, siblingPath), 'utf8'));
    if (sibling.data.slug === frontmatter.slug) fail(`Duplicate slug: ${frontmatter.slug} also exists in ${siblingPath}`);
  }

  return { slug: frontmatter.slug, postPath, imagePath, kind };
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const { kind, ...result } = await validatePost(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
