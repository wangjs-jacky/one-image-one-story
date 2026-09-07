import { execFileSync } from 'node:child_process';

const git = (args, repositoryRoot) => execFileSync('git', args, {
  cwd: repositoryRoot,
  encoding: 'utf8',
  stdio: 'pipe',
}).trim();

export const assertPublicationHead = (baseline, { repositoryRoot = process.cwd() } = {}) => {
  const head = git(['rev-parse', '--verify', 'HEAD'], repositoryRoot);
  if (head !== baseline.commit) {
    throw new Error(`Local HEAD must equal remote main before content publication (local ${head}, remote ${baseline.commit}). Reconcile unexpected outgoing history or incoming changes separately before retrying`);
  }
};

export const establishPublicationBaseline = ({ repositoryRoot = process.cwd() } = {}) => {
  let remoteUrls;
  try {
    remoteUrls = git(['remote', 'get-url', '--push', '--all', 'origin'], repositoryRoot).split('\n').filter(Boolean);
  } catch {
    throw new Error('Cannot establish remote main baseline: configure the existing origin push destination first');
  }
  if (remoteUrls.length !== 1) throw new Error('Content publication requires exactly one push destination for origin');
  const remoteUrl = remoteUrls[0];
  let output;
  try {
    // Read the actual push destination, without trusting a stale tracking ref
    // or a potentially different fetch URL. Keep this destination for the push.
    output = git(['ls-remote', '--exit-code', '--refs', '--', remoteUrl, 'refs/heads/main'], repositoryRoot);
  } catch {
    throw new Error('Cannot establish remote main baseline: check origin access and publish repository code/main separately before publishing content');
  }
  const match = output.match(/^([a-f0-9]{40}|[a-f0-9]{64})\trefs\/heads\/main$/);
  if (!match) throw new Error('Cannot establish remote main baseline: expected exactly one existing refs/heads/main');
  const baseline = { commit: match[1], remoteUrl };
  assertPublicationHead(baseline, { repositoryRoot });
  return baseline;
};

export const pushPublicationCommit = (baseline, commit, allowed, { repositoryRoot = process.cwd() } = {}) => {
  const ancestry = git(['rev-list', '--parents', '-n', '1', commit], repositoryRoot).split(' ');
  if (ancestry.length !== 2 || ancestry[0] !== commit || ancestry[1] !== baseline.commit) {
    throw new Error('Content commit must have remote main as its only parent; local commits were preserved for separate reconciliation');
  }
  const files = git(['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', commit], repositoryRoot).split('\0').filter(Boolean);
  if (files.length !== 2 || files.some((file) => !allowed.has(file))) {
    throw new Error('Committed files must be exactly the requested Markdown and PNG pair; local commit was preserved for inspection');
  }
  try {
    // The direct-parent check above makes this a fast-forward from the exact
    // baseline. The explicit lease also rejects remote advances/rollbacks
    // racing with validation; a moving HEAD cannot add history to this push.
    git(['push', '--porcelain', '--no-follow-tags', `--force-with-lease=refs/heads/main:${baseline.commit}`, '--', baseline.remoteUrl, `${commit}:refs/heads/main`], repositoryRoot);
  } catch {
    throw new Error(`Push failed against remote main baseline ${baseline.commit}. Local content commit ${commit} was preserved. Reconcile remote changes or push access separately; do not recreate the post`);
  }
};
