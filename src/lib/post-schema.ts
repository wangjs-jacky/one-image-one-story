import { z } from 'zod';

export const postFrontmatterSchema = z.object({
  title: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  publishedAt: z.string().datetime({ offset: true }),
  summary: z.string().min(1).max(120),
  image: z.string().regex(/^\/images\/posts\/[a-z0-9-]+\.png$/),
  imageAlt: z.string().min(1).max(160),
  tags: z.array(z.string().min(1)).min(1).max(8),
  sourceType: z.enum(['topic', 'text', 'url']),
  sourceUrl: z.string().url().refine((value) => /^https?:\/\//i.test(value), {
    message: 'sourceUrl must use http:// or https://',
  }).nullable(),
  status: z.literal('published'),
}).superRefine((value, context) => {
  if (value.sourceType === 'url' && value.sourceUrl === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['sourceUrl'], message: 'URL input requires sourceUrl' });
  }
});

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;
export const validatePostFrontmatter = (value: unknown): PostFrontmatter => postFrontmatterSchema.parse(value);
