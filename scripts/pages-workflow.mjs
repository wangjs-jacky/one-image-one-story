// This is the filename for Task 4's .github/workflows/deploy-pages.yml.
export const pagesWorkflowFile = 'deploy-pages.yml';

export const pagesRunArgs = (commit) => [
  'run', 'list', '--workflow', pagesWorkflowFile, '--commit', commit,
  '--branch', 'main', '--event', 'push', '--json', 'databaseId,headSha,headBranch,event', '--limit', '100',
];

export const selectPagesRun = (runs, commit) => runs.find((run) => (
  run.headSha === commit && run.headBranch === 'main' && run.event === 'push'
));
