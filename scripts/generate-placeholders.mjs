#!/usr/bin/env node
/**
 * generate-placeholders.mjs
 *
 * Generates every placeholder image the site needs until real client assets
 * arrive (tracked in ASSETS-NEEDED.md). All frames are flat, dark, and
 * loudly labeled PLACEHOLDER so nothing ships by accident.
 *
 * Outputs:
 *   assets-src/pairs/{jaw,posture,physique}-{before,after}.png   1200×1600
 *   assets-src/poster/hero-poster.png                            1920×1080
 *   public/img/og-default.jpg                                    1200×630
 *   public/apple-touch-icon.png                                  180×180
 *
 * The assets-src outputs are sources only — `npm run placeholders` pipes them
 * through the image pipeline script, and markup references the
 * optimized AVIF/WebP in public/img. Never reference assets-src directly.
 *
 * Colors mirror src/styles/tokens.css (SVG cannot read CSS custom properties).
 */

import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const C = {
  bg: '#0a080e',
  surface: '#121019',
  surface2: '#1c1826',
  border: '#2b2638',
  accent: '#2f7fff',
  accentDim: '#123a78',
  red: '#d94358',
  text: '#f4f2f7',
  muted: '#aaa3b4',
  faint: '#6f687e',
};

/* Line-art glyphs on a 24px grid — same paths as src/components/Icon.astro */
const GLYPHS = {
  jaw: '<path d="M14.6 3.5A7.6 7.6 0 0 0 7 11c0 1.8-.7 2.9-1.8 4-.3.3-.2.9.2 1l1.6.7v2c0 .9.7 1.7 1.6 1.7H12"/><path d="M10.8 12.6c1.7 1.3 4.4 1 5.8-.7"/>',
  posture: '<path d="M12 20V5"/><path d="M8 8.5 12 4.5l4 4"/><path d="M6.5 21h11"/>',
  physique: '<path d="M6.5 4c0 3 .5 5 2 6.4 1 1 1.6 2.3 1.6 3.8V20"/><path d="M17.5 4c0 3-.5 5-2 6.4-1 1-1.6 2.3-1.6 3.8V20"/><path d="M9.5 8h5"/>',
  play: '<path d="M8.5 5.5v13l11-6.5-11-6.5Z"/>',
};

const svgDoc = (w, h, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;

const glyph = (name, x, y, size, stroke) =>
  `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name]}</g>`;

const label = (x, y, size, fill, text, weight = 600, spacing = '0.14em') =>
  `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${fill}" text-anchor="middle">${text}</text>`;

/** One side of a before/after pair, portrait 1200×1600. */
function pairFrame(category, phase) {
  const after = phase === 'AFTER';
  const stroke = after ? C.accent : C.faint;
  const w = 1200;
  const h = 1600;
  return svgDoc(
    w,
    h,
    [
      `<rect width="${w}" height="${h}" fill="${after ? C.surface : C.bg}"/>`,
      `<rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="${C.border}" stroke-width="2"/>`,
      glyph(category, w / 2 - 210, h / 2 - 330, 420, stroke),
      label(w / 2, h / 2 + 220, 64, stroke, phase, 700, '0.3em'),
      label(w / 2, h / 2 + 310, 44, C.muted, category.toUpperCase()),
      label(w / 2, h - 120, 36, C.faint, 'PLACEHOLDER: CLIENT PHOTO PENDING'),
    ].join(''),
  );
}

/** 1920×1080 poster frame for the hero video facade. */
function posterFrame() {
  const w = 1920;
  const h = 1080;
  return svgDoc(
    w,
    h,
    [
      `<rect width="${w}" height="${h}" fill="${C.bg}"/>`,
      `<circle cx="${w / 2}" cy="${h / 2 - 60}" r="130" fill="${C.surface2}" stroke="${C.border}" stroke-width="3"/>`,
      glyph('play', w / 2 - 66, h / 2 - 126, 132, C.accent),
      label(w / 2, h / 2 + 190, 88, C.text, 'BIOMAXXER', 800, '0.22em'),
      label(w / 2, h / 2 + 270, 40, C.muted, 'PLACEHOLDER: SKOOL AD VIDEO PENDING'),
    ].join(''),
  );
}

/** 1200×630 Open Graph card. JPEG output — social scrapers handle AVIF poorly. */
function ogFrame() {
  const w = 1200;
  const h = 630;
  return svgDoc(
    w,
    h,
    [
      `<defs><linearGradient id="og-helix" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.red}"/><stop offset="1" stop-color="${C.accent}"/></linearGradient><linearGradient id="og-badge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.red}"/><stop offset="1" stop-color="${C.accent}"/></linearGradient></defs>`,
      `<rect width="${w}" height="${h}" fill="${C.bg}"/>`,
      `<rect x="20" y="20" width="${w - 40}" height="${h - 40}" fill="none" stroke="${C.border}" stroke-width="2"/>`,
      `<circle cx="${w / 2}" cy="172" r="62" fill="${C.accentDim}"/>`,
      `<circle cx="${w / 2}" cy="172" r="59" fill="none" stroke="${C.accent}" stroke-opacity="0.5" stroke-width="4"/>`,
      `<g transform="translate(${w / 2 - 44} 128) scale(3.7)" fill="none" stroke="url(#og-badge)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2c0 5 8 7 8 10s-8 5-8 10"/><path d="M16 2c0 5-8 7-8 10s8 5 8 10"/><path d="M8.6 4.5h6.8"/><path d="M10.4 7.5h3.2"/><path d="M10.4 16.5h3.2"/><path d="M8.6 19.5h6.8"/></g>`,
      label(w / 2, 360, 100, C.text, 'BIOMAXXER', 800, '0.2em'),
      `<rect x="${w / 2 - 260}" y="404" width="520" height="4" fill="url(#og-helix)"/>`,
      label(w / 2, 478, 38, C.muted, 'SYSTEMATIC SELF-OPTIMIZATION'),
    ].join(''),
  );
}

/** 180×180 apple-touch-icon — the brand badge: navy circle, gradient helix. */
function touchIconFrame() {
  const helix =
    '<path d="M8 2c0 5 8 7 8 10s-8 5-8 10"/><path d="M16 2c0 5-8 7-8 10s8 5 8 10"/><path d="M8.6 4.5h6.8"/><path d="M10.4 7.5h3.2"/><path d="M10.4 16.5h3.2"/><path d="M8.6 19.5h6.8"/>';
  return svgDoc(
    180,
    180,
    [
      `<defs><linearGradient id="ti-helix" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.red}"/><stop offset="1" stop-color="${C.accent}"/></linearGradient></defs>`,
      `<rect width="180" height="180" rx="40" fill="${C.bg}"/>`,
      `<circle cx="90" cy="90" r="80" fill="${C.accentDim}"/>`,
      `<circle cx="90" cy="90" r="77" fill="none" stroke="${C.accent}" stroke-opacity="0.5" stroke-width="5"/>`,
      `<g transform="translate(31 31) scale(4.9)" fill="none" stroke="url(#ti-helix)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${helix}</g>`,
    ].join(''),
  );
}

async function main() {
  await mkdir('assets-src/pairs', { recursive: true });
  await mkdir('assets-src/poster', { recursive: true });
  await mkdir('public/img', { recursive: true });

  const jobs = [];

  for (const category of ['jaw', 'posture', 'physique']) {
    // Never clobber real client imagery (produced by scripts/crop-composites.mjs).
    if (existsSync(`assets-src/client-pairs/${category}-before.png`)) {
      console.log(`skip ${category}: real client pair exists in assets-src/client-pairs`);
      continue;
    }
    for (const phase of ['BEFORE', 'AFTER']) {
      jobs.push(
        sharp(Buffer.from(pairFrame(category, phase)))
          .png({ compressionLevel: 9, palette: true })
          .toFile(`assets-src/pairs/${category}-${phase.toLowerCase()}.png`),
      );
    }
  }

  if (existsSync('assets-src/poster/hero-poster.jpg')) {
    console.log('skip poster: real frame extracted from the client video exists');
  } else {
    jobs.push(
      sharp(Buffer.from(posterFrame()))
        .png({ compressionLevel: 9, palette: true })
        .toFile('assets-src/poster/hero-poster.png'),
    );
  }

  jobs.push(
    sharp(Buffer.from(ogFrame()))
      .flatten({ background: C.bg })
      .jpeg({ quality: 82 })
      .toFile('public/img/og-default.jpg'),
    sharp(Buffer.from(touchIconFrame()))
      .png({ compressionLevel: 9 })
      .toFile('public/apple-touch-icon.png'),
  );

  await Promise.all(jobs);
  console.log('Placeholder sources written. Run the image-pipeline script next (npm run placeholders does both).');
}

main();
