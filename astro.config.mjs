// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// Production origin. Canonicals and OG URLs derive from src/config.ts
// SITE_ORIGIN — keep the two values identical.
export default defineConfig({
  site: 'https://biomaxxer.com',
  output: 'static',
  integrations: [
    // The slider island is authored as a React component; preact/compat
    // renders it at ~7KB gz instead of react-dom's ~61KB gz, which is the
    // only way the contractual <50KB total-JS budget holds. To swap back to
    // full React (and accept breaking that budget): @astrojs/react + react +
    // react-dom, and drop the compat flag + tsconfig paths aliases.
    preact({ compat: true }),
    sitemap({
      // status pages don't belong in the sitemap
      filter: (page) => !page.includes('/404'),
    }),
  ],
  build: {
    // 'auto' inlines any stylesheet smaller than assetsInlineLimit. The limit
    // is raised below so the site's entire CSS inlines into each page and
    // nothing render-blocking is left in <head>.
    inlineStylesheets: 'auto',
  },
  vite: {
    build: { assetsInlineLimit: 32768 },
  },
});
