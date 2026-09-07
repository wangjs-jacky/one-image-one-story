import { describe, expect, it } from 'vitest';
import { pagesRunArgs, selectPagesRun } from '../scripts/pages-workflow.mjs';

describe('Pages workflow selection', () => {
  it('queries only Task 4 deploy-pages runs on main push for the new SHA', () => {
    expect(pagesRunArgs('new-sha')).toEqual([
      'run', 'list', '--workflow', 'deploy-pages.yml', '--commit', 'new-sha',
      '--branch', 'main', '--event', 'push', '--json', 'databaseId,headSha,headBranch,event', '--limit', '100',
    ]);
  });

  it('selects only a run whose SHA, branch, and event all match', () => {
    expect(selectPagesRun([
      { databaseId: 1, headSha: 'new-sha', headBranch: 'main', event: 'workflow_dispatch' },
      { databaseId: 2, headSha: 'other-sha', headBranch: 'main', event: 'push' },
      { databaseId: 3, headSha: 'new-sha', headBranch: 'main', event: 'push' },
    ], 'new-sha')).toEqual({ databaseId: 3, headSha: 'new-sha', headBranch: 'main', event: 'push' });
  });
});
