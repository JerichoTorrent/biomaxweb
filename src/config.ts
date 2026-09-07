/**
 * Site-wide constants — the single place external URLs and placeholders live.
 *
 * Every {{TOKEN}} below is a placeholder the client supplies before launch.
 * The full list, with formats and caps, is in ASSETS-NEEDED.md at the repo
 * root. Grep for `{{` to find every placeholder in the codebase.
 */

export const SITE_NAME = 'Biomaxxer';

/** Production origin — canonicals and OG tags derive from this value.
 *  Keep it identical to `site` in astro.config.mjs (drives the sitemap). */
export const SITE_ORIGIN = 'https://biomaxxer.com';

/** Priority CTA — the paid Skool community. Live URL, supplied by client. */
export const SKOOL_URL = 'https://skool.com/biomaxxing';

/** External Stripe checkout for the $120 one-on-one consultation. */
export const STRIPE_URL = 'https://buy.stripe.com/8x27sN0gI16J3Ugfr28N20m';

/** Invite link for the free Discord community (from the client's hoo.be). */
export const DISCORD_INVITE = 'https://discord.gg/FDTmu2QrMa';

export const CONSULT_PRICE_USD = 120;

/**
 * DRAFT footer disclaimer — standard educational-content boilerplate, NOT
 * reviewed by counsel. The client (or their counsel) must approve or replace
 * this wording before launch; tracked as a blocking item in ASSETS-NEEDED.md.
 */
export const DISCLAIMER =
  'The content on this site and inside the Biomaxxing community is for educational and informational purposes only. It is not medical advice, and it is not a substitute for professional medical advice, diagnosis, or treatment. Biomaxxer is not a licensed physician, and no doctor-patient relationship is created by using this site, joining the community, or booking a consultation. Always consult a qualified healthcare provider before changing your training, diet, supplementation, or medication. Transformations shown are individual member results, not a guarantee of your outcome.';

export const DEFAULT_DESCRIPTION =
  'Biomaxxing is a community for individuals who treat their body like an engineering project: training, bone structure, aesthetics, and cognition, built on protocols instead of guesswork.';

export const DEFAULT_OG_IMAGE = '/img/og-default.jpg';

/** Hero poster — one file, shared by the head preload (via index.astro) and
 *  the video's poster attribute so the two never drift. A single file because
 *  the poster attribute takes exactly one URL, and layering a responsive
 *  <picture> under the video fails: Chrome paints an opaque layer for
 *  <video controls> even before any data loads. Regenerate via
 *  `npm run images -- assets-src/poster --widths 1000 --quality 52`. */
export const HERO_POSTER = {
  href: '/img/hero-poster-1000.avif',
  type: 'image/avif',
};
