# Biomaxxer site

Static marketing site for the Biomaxxer community. Four routes (`/`, `/links`,
`/discord`, `/404`), no backend, no accounts, no payments on-site: every
transaction happens off-site on Skool or Stripe, and the site's one job is to
send people there fast.

**Stack:** Astro 5 (`output: 'static'`), strict TypeScript, plain CSS custom
properties (no Tailwind, no UI kit), one JavaScript island (the before/after
slider), `sharp` for build-time image processing, Docker + nginx to serve.

## Quickstart

New to the project? `SETUP.md` walks through install, editing, and hosting
end to end.

```bash
npm ci          # install
npm run dev     # dev server on http://localhost:4321
npm run check   # production build + performance budget audit (run before shipping)
npm run preview # serve the production build locally
```

| Command                | What it does                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                                          |
| `npm run build`        | Production build to `dist/`                                         |
| `npm run check`        | Build, then audit `dist/` against the performance budget (hard fail) |
| `npm run typecheck`    | `astro check` under strict TypeScript                               |
| `npm run images -- <file-or-dir>` | Optimize images to AVIF/WebP at responsive widths       |
| `npm run placeholders` | Regenerate all placeholder imagery                                  |
| `npm run preview`      | Serve `dist/` on http://localhost:4321                              |

## Performance budget (contractual)

The client measures with PageSpeed Insights, mobile. `npm run check` enforces
the static half of this mechanically and exits non-zero on a breach:

| Metric                        | Target  |
| ----------------------------- | ------- |
| Lighthouse Performance mobile | ≥ 90    |
| SEO / Accessibility / BP      | ≥ 95    |
| LCP                           | < 2.0s  |
| CLS                           | < 0.05  |
| Total JS (gzipped)            | < 50KB  |
| Total page weight             | < 1MB   |

Do not merge work while `npm run check` fails. Before delivery, confirm with a
real run: `npm run preview` then `npx lighthouse http://localhost:4321`.

---

## Editing the site yourself (no developer needed)

Everything you will normally want to change lives in three JSON files and a
handful of clearly marked text blocks. The workflow is always the same:

1. Edit the file.
2. Rebuild and redeploy: `docker compose up --build -d` (or hand the change
   to whoever deploys).

If you break a file's format, the build **stops with an error that names the
file and the field** instead of publishing a broken site. That is deliberate.
Fix the field it names and rebuild.

### Testimonials — `src/content/testimonials.json`

Each review looks like this. Copy an existing block, change the text, keep the
commas and quotes exactly as they are:

```json
{
  "id": "t9",
  "name": "First name L.",
  "quote": "The review text. Keep it under 280 characters.",
  "rating": 5,
  "source": "Skool",
  "placeholder": false
}
```

- `id` must be unique (t9, t10, ...). `rating` is 1 to 5.
- Quotes longer than 280 characters fail the build; trim them.
- Set `"placeholder": false` on real entries. Cap: 12 testimonials.

### FAQ — `src/content/faq.json`

Same idea. `order` controls position (1 shows first). Cap: 12 items.

### The /links page — `src/content/links.json`

One block per row on the links page. `kind` decides the group:
`community`, `social`, `content` (free resources), or `sponsor` (partners).
Sponsor rows must keep `"sponsored": true` — that is an SEO requirement, not
decoration. `icon` is one of: `community`, `discord`, `x`, `instagram`,
`youtube`, `tiktok`, `link`, `arrow-right`. Cap: 20 links total.

A row can carry card art instead of an icon: set `"image": "link-<name>"`
after generating the thumbnail set with
`npm run images -- path/to/art.png --widths 64,128 --sizes "44px"`
(square-crop the art first; the file's name becomes the `link-<name>` value).
The order of the groups themselves (Community, Partners, Social, Free
resources) is set near the top of `src/pages/links.astro`.

### Page copy (headlines and paragraphs)

| Section                    | File                                              |
| -------------------------- | ------------------------------------------------- |
| Hero headline + video      | `src/components/sections/Hero.astro`              |
| Consultation               | `src/components/sections/Consultation.astro`      |
| Five transformation stages | `src/components/sections/Transformations.astro`   |
| Dual CTA                   | `src/components/sections/DualCta.astro`           |
| Reviews heading            | `src/components/sections/Reviews.astro`           |
| Footer layout              | `src/components/Footer.astro`                     |
| Disclaimer text            | `src/config.ts` (`DISCLAIMER`)                    |
| Discord page               | `src/pages/discord.astro`                         |

Open the file, change only the words between tags (`<p>like this</p>`), save,
rebuild. Do not touch anything inside `< >` brackets.

### Prices and destination URLs — `src/config.ts`

The Skool URL, Stripe checkout URL, Discord invite, and the $120 price all
live in this one file.

### Swapping in real photos

1. Put the original photos (any size, straight off the phone is fine) in a
   folder, named like `jaw-before.jpg`, `jaw-after.jpg`.
2. Run: `npm run images -- path/to/folder --widths 400,800,1200 --sizes "(min-width: 768px) 560px, 100vw"`
3. Optimized copies land in `public/img/` under the same names the site
   already references; matching names replace placeholders automatically.

The command prints a size report. If it warns a file is over 150KB, lower the
`--quality` (default 62) for that image.

### Swapping in the real video

Drop the file at `public/video/hero-ad.mp4` (H.264 MP4, 60 seconds or less)
plus captions at `public/video/hero-ad.en.vtt`. Then regenerate the poster
frame from a still: `npm run images -- poster-still.jpg --outdir public/img --widths 800,1200,1600`
naming the still `hero-poster.jpg` first, so the optimized names match.

---

## Images (developer notes)

Never reference a raw image in markup. Everything goes through
`scripts/optimize-images.mjs` (wrapped by
`npm run images`), which emits AVIF + WebP ladders and prints paste-ready
`<picture>` markup. The `Picture.astro` component and the slider island both
follow that markup shape: AVIF, WebP, raster fallback, explicit
`width`/`height`.

The client sends transformations as single landscape composites (name banner
plus before → after panels). `scripts/crop-composites.mjs` slices those into
the site's 1200×1600 pair format (name banners excluded) — add an entry to
its table for each new composite, run it, then run the pipeline over
`assets-src/client-pairs`.

Placeholder art is generated by `scripts/generate-placeholders.mjs` (wrapped
with the pipeline by `npm run placeholders`); it skips any category that has
real client imagery so re-running can never clobber real assets.

## Video

`public/video/hero-ad.mp4` is the client-supplied web encode (H.264 720p,
11.7MB, faststart) from the "hero for biomaxxing" kit. To re-transcode from
a raw master (the original is 109MB HEVC, which Chrome/Firefox cannot play):

```bash
ffmpeg -i Skool_Ad.mp4 -vf scale=1280:720 -c:v libx264 -preset slow -crf 28 \
  -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart public/video/hero-ad.mp4
```

The hero poster is one AVIF on the video's `poster` attribute, declared once
in `src/config.ts` (`HERO_POSTER`) so the head preload and the attribute
never drift. It stays a single file on purpose: the poster attribute takes
exactly one URL, and layering a responsive `<picture>` under the video does
not work — Chrome paints `<video controls>` opaque before any data loads.
Regenerate from a still with:
`npm run images -- assets-src/poster --widths 1000 --quality 52`.

The video is click-to-load (`preload="none"`), so the budget script gives it
its own 12MB ceiling instead of counting it toward the 1MB page-load total —
it costs zero bytes until someone presses play. Masters stay out of git
(`masters/` is ignored); keep them with the client.

## Fonts

One self-hosted variable font file: `public/fonts/inter-latin-wght-normal.woff2`
(latin subset, weights 100–900), preloaded in `Base.astro`, `font-display: swap`
with a metric-matched Arial fallback so the swap does not shift layout. No
Google Fonts request anywhere. If you replace the font, keep it to a maximum
of two woff2 files (performance budget).

## Deployment

The client hosts on his own server and owns domain, DNS, and TLS. This repo
ships the container only:

```bash
docker compose up --build -d   # site on http://localhost:8080
```

- Multi-stage build: `node:22-alpine` builds, `nginx:1.27-alpine` serves. A
  middle stage compiles the ngx_brotli modules against the image's exact
  nginx version (`--with-compat`).
- `nginx.conf` (full config): brotli + gzip, immutable caching for hashed
  `/_astro/` assets, 7-day cache for media, revalidating HTML, correct MIME
  types for `.avif`/`.woff2` (a wrong font MIME silently falls back to system
  fonts), `error_page 404`.
- The container listens on plain HTTP :80. Put the TLS-terminating proxy in
  front of it; HSTS/CSP policy belongs to that layer.

## Design system

- Every color, size, and spacing value comes from `src/styles/tokens.css`.
  Never inline a value; if a token is missing, add it there first
  (the design system section below is the authority).
- Island policy: `.astro` by default; the before/after slider is the only
  `.tsx` and the only client-side JavaScript. Do not add a second island
  without checking scope.
- **Renderer note:** the slider is authored as a React component but rendered
  through `preact/compat` (~7KB gz). Plain `react-dom` is ~61KB gz, which is
  larger than the entire 50KB contractual JS budget. To revert to full React
  anyway: install `@astrojs/react react react-dom`, swap the integration in
  `astro.config.mjs`, and remove the `paths` aliases in `tsconfig.json` —
  and accept that `npm run check` will fail.

## Structure

```
src/
├── components/
│   ├── sections/        # homepage sections, one file each
│   ├── islands/         # the only .tsx — BeforeAfterSlider
│   ├── Header.astro / Footer.astro / Icon.astro / Picture.astro
├── layouts/Base.astro   # owns the entire <head>, all meta + JSON-LD
├── pages/               # index, links, discord, 404 — fixed set
├── styles/              # tokens.css (authority) + global.css
├── content/             # testimonials/faq/links JSON + zod schemas
└── config.ts            # URLs, price, site origin
public/                  # fonts, optimized img, video slot, robots.txt
scripts/                 # image pipeline, perf budget, placeholder generator
```
