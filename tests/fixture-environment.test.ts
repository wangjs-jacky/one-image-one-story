import { describe, expect, it } from 'vitest';
import { fixtureEnvironment } from '../scripts/fixture-environment.mjs';

describe('fixture check environment', () => {
  it('pins fixture paths and base path independently from the caller environment', () => {
    expect(fixtureEnvironment({ POSTS_DIR: 'outside', BASE_PATH: '/one-image-one-story/', SITE_URL: 'https://example.test' })).toEqual({
      POSTS_DIR: './tests/fixtures/posts',
      BASE_PATH: '/',
      SITE_URL: 'https://example.test',
    });
  });
});
