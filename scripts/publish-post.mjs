import { execFileSync, spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { expectedPaths, porcelainStatusLines, unexpectedChanges } from './post-files.mjs';
import { runPublicationChecks } from './publish-checks.mjs';
import { assertPublicationHead, establishPublicationBaseline, pushPublicationCommit } from './publish-git.mjs';
import { pagesRunArgs, selectPagesRun } from './pages-workflow.mjs';
import { validatePost } from './validate-post.mjs';

const fail = (message) => {
  throw new Error(message);
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: process.cwd(), encoding: 'utf8', stdio: 'inherit', ...options });
  if (result.error) fail(`Could not run ${command}: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed`);
};

const parseArgs = (args) => {
  const values = { dryRun: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--dry-run') {
      if (values.dryRun) fail('Argument may only be provided once: --dry-run');
      values.dryRun = true;
      continue;
    }
    if (!['--post', '--image', '--message'].includes(argument)) fail(`Unknown argument: ${argument}`);
    if (values[argument]) fail(`Argument may only be provided once: ${argument}`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) fail(`Missing value for ${argument}`);
    values[argument] = value;
    index += 1;
  }
  if (!values['--post'] || !values['--image'] || !values['--message']) {
    fail('--post, --image, and --message are required');
  }
  return { postPath: values['--post'], imagePath: values['--image'], message: values['--message'], dryRun: values.dryRun };
};

const sensitiveValue = /(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AIza[\w-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;

const assertNoSensitiveInput = (values) => {
  for (const [label, value] of Object.entries(values)) {
    if (sensitiveValue.test(value)) fail(`Sensitive value detected in ${label}`);
  }
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const porcelainPaths = () => porcelainStatusLines(execFileSync('git', [
  'status', '--porcelain=v1', '-z', '--untracked-files=all',
], { cwd: process.cwd() }).toString('utf8'));

const stagedPaths = () => execFileSync('git', ['diff', '--cached', '--name-only', '-z'], { cwd: process.cwd() })
  .toString('utf8')
  .split('\0')
  .filter(Boolean);

const commitSha = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd(), encoding: 'utf8' }).trim();

const siteUrls = (slug) => {
  const repository = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], { cwd: process.cwd(), encoding: 'utf8' }).trim();
  const owner = repository.split('/')[0];
  const repo = repository.split('/')[1];
  return { homeUrl: `https://${owner}.github.io/${repo}/`, postUrl: `https://${owner}.github.io/${repo}/posts/${slug}/` };
};

const waitForPagesRun = async (commit) => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const output = execFileSync('gh', pagesRunArgs(commit), {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const pagesRun = selectPagesRun(JSON.parse(output), commit);
    if (pagesRun) {
      run('gh', ['run', 'watch', String(pagesRun.databaseId), '--exit-status']);
      return;
    }
    await sleep(5000);
  }
  fail(`Could not locate a Pages workflow run for commit ${commit}`);
};

const publish = async () => {
  const options = parseArgs(process.argv.slice(2));
  assertNoSensitiveInput({ message: options.message, postPath: options.postPath, imagePath: options.imagePath });
  const validated = await validatePost(options);
  assertNoSensitiveInput({ postBody: await readFile(validated.postPath, 'utf8') });
  if (!options.dryRun && validated.kind !== 'production') fail('Live publication requires production post and image paths');
  const allowed = expectedPaths(validated.postPath, validated.imagePath);

  runPublicationChecks(run);

  const unexpected = unexpectedChanges(porcelainPaths(), allowed);
  if (unexpected.length) fail(`Unrelated worktree changes detected: ${unexpected.join(', ')}`);

  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify({ dryRun: true, files: [...allowed] })}\n`);
    return;
  }

  const baseline = establishPublicationBaseline();
  run('git', ['add', '--', validated.postPath, validated.imagePath]);
  const staged = stagedPaths();
  if (staged.length !== 2 || staged.some((file) => !allowed.has(file))) {
    fail(`Staging must contain exactly the requested Markdown and PNG pair; found ${staged.join(', ') || 'nothing'}`);
  }

  assertPublicationHead(baseline);
  run('git', ['commit', '-m', options.message]);
  const commit = commitSha();
  pushPublicationCommit(baseline, commit, allowed);
  await waitForPagesRun(commit);
  process.stdout.write(`${JSON.stringify({ commit, ...siteUrls(validated.slug) })}\n`);
};

try {
  await publish();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
