import { defineConfig } from 'astro/config';

const fixtureBuild = Boolean(process.env.POSTS_DIR);

export default defineConfig({
  site: process.env.SITE_URL ?? 'http://localhost:4321',
  base: process.env.BASE_PATH ?? '/',
  output: 'static',
  outDir: fixtureBuild ? './.fixture-build/dist' : './dist',
  cacheDir: fixtureBuild ? './.fixture-build/cache' : './.astro/production-cache',
  publicDir: fixtureBuild ? './tests/fixtures/public' : './public',
});
