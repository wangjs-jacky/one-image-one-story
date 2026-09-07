import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { postFrontmatterSchema } from './lib/post-schema';

const posts = defineCollection({ loader: glob({ base: process.env.POSTS_DIR ?? './src/content/posts', pattern: '**/*.{md,mdx}' }), schema: postFrontmatterSchema });

export const collections = { posts };
