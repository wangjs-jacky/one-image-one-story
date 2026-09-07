export const fixtureEnvironment = (environment = process.env) => ({
  ...environment,
  POSTS_DIR: './tests/fixtures/posts',
  BASE_PATH: '/',
});
