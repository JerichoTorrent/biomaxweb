import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

/**
 * All client-editable copy lives in src/content/*.json, validated at build
 * time. A schema violation fails the build with a readable error instead of
 * silently rendering blank — see the README for the editing guide.
 *
 * `placeholder: true` marks seed entries that must be replaced with real
 * client content before launch (tracked in ASSETS-NEEDED.md).
 */

const testimonials = defineCollection({
  loader: file('src/content/testimonials.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    quote: z.string().max(280),
    rating: z.number().min(1).max(5),
    source: z.string().default('Skool'),
    placeholder: z.boolean().default(false),
  }),
});

const faq = defineCollection({
  loader: file('src/content/faq.json'),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    question: z.string(),
    answer: z.string(),
    placeholder: z.boolean().default(false),
  }),
});

const links = defineCollection({
  loader: file('src/content/links.json'),
  schema: z.object({
    id: z.string(),
    order: z.number(),
    label: z.string(),
    url: z.string(),
    kind: z.enum(['social', 'community', 'sponsor', 'content']),
    /** Icon name from src/components/Icon.astro */
    icon: z.string().default('link'),
    /** Optional thumbnail: base name of a 64/128 avif+webp set in public/img
     *  (generated from the client's hoo.be card art). Wins over `icon`. */
    image: z.string().optional(),
    /** Sponsored/affiliate links get rel="sponsored" — required SEO hygiene */
    sponsored: z.boolean().default(false),
    note: z.string().optional(),
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { testimonials, faq, links };
