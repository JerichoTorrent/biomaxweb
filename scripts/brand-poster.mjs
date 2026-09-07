#!/usr/bin/env node
/**
 * brand-poster.mjs
 *
 * Art-directs the raw hero poster frame so the bright video still sits
 * naturally on the near-black page: edge vignette, a bottom scrim where the
 * player chrome lives, and a small baked-in label. Reads the raw frame from
 * assets-src/poster/hero-poster.jpg and writes the branded version to
 * assets-src/poster-branded/hero-poster.jpg (same basename, so the image
 * pipeline emits the same public filenames).
 *
 *   node scripts/brand-poster.mjs
 *   npm run images -- assets-src/poster-branded --widths 1000 --quality 52
 *
 * Colors mirror src/styles/tokens.css (SVG cannot read CSS custom properties).
 */

import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const BG = '#0a080e';
const ACCENT = '#2f7fff';
const TEXT = '#f4f2f7';

const W = 1280;
const H = 720;

const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="vignette" cx="50%" cy="42%" r="78%">
      <stop offset="48%" stop-color="${BG}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${BG}" stop-opacity="0.88"/>
    </radialGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BG}" stop-opacity="0"/>
      <stop offset="1" stop-color="${BG}" stop-opacity="0.85"/>
    </linearGradient>
    <linearGradient id="top" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${BG}" stop-opacity="0"/>
      <stop offset="1" stop-color="${BG}" stop-opacity="0.82"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  <rect y="${H - 220}" width="${W}" height="220" fill="url(#scrim)"/>
  <rect width="${W}" height="150" fill="url(#top)"/>
  <rect x="48" y="50" width="13" height="13" fill="${ACCENT}"/>
  <text x="76" y="63" font-family="Helvetica, Arial, sans-serif" font-size="21"
    font-weight="700" letter-spacing="4.5" fill="${TEXT}">THE BREAKDOWN<tspan
    fill="#aaa3b4" font-weight="500" letter-spacing="3" dx="18">1:57</tspan></text>
</svg>`;

await mkdir('assets-src/poster-branded', { recursive: true });
await sharp('assets-src/poster/hero-poster.jpg')
  .resize(W, H, { fit: 'cover' })
  .composite([{ input: Buffer.from(overlay) }])
  .jpeg({ quality: 92 })
  .toFile('assets-src/poster-branded/hero-poster.jpg');
console.log('Branded poster written to assets-src/poster-branded/hero-poster.jpg');
