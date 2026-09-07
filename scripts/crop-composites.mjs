#!/usr/bin/env node
/**
 * crop-composites.mjs
 *
 * The client supplies member transformations as single landscape composites
 * (name banner + before photo -> after photo). The slider needs separate,
 * same-sized portrait frames. This script crops each composite's two panels
 * (name banner excluded) and normalizes them to the site's 1200x1600 pair
 * format in assets-src/client-pairs/, ready for the image pipeline:
 *
 *   node scripts/crop-composites.mjs
 *   npm run images -- assets-src/client-pairs --widths 400,800,1200 \
 *     --sizes "(min-width: 768px) 560px, 100vw"
 *
 * Panel positions are fractions of the composite's size, per source layout.
 * When the client sends new composites, add an entry and re-run.
 */

import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'masters';
const OUT = 'assets-src/client-pairs';

/** fractions: [x0, x1, y0, y1] of the full composite.
 *  Empty since 2026-08-30: the client re-dropped every member photo as a
 *  pre-cut transparent PNG (see SINGLES), replacing the old composites. */
const COMPOSITES = [];

/* Standalone before/after photos: normalized to the pair format. cut:true
   trims a cutout's transparent margins so the subject fills the frame;
   fr crops first (e.g. screenshot UI chrome). File names are the client's
   own from the 2026-08-30 drop. */
const SINGLES = [
  { file: `${SRC}/new cutout 5.png`, dest: 'jaw-before', cut: true },
  { file: `${SRC}/new cytout 7.png`, dest: 'jaw-after', cut: true },
  { file: `${SRC}/new ctoay 672.png`, dest: 'frame-before', cut: true },
  { file: `${SRC}/new cutout 1347.png`, dest: 'frame-after', cut: true },
  { file: `${SRC}/new cutout.png`, dest: 'physique-before', cut: true },
  { file: `${SRC}/new cutout2.png`, dest: 'physique-after', cut: true },
  { file: `${SRC}/new cutout 1.png`, dest: 'physique2-before', cut: true },
  { file: `${SRC}/new cutout 67.png`, dest: 'physique2-after', cut: true },
];
/* The Protocol Design graphic (protocol-design.webp in the drop folder) is
   not rasterized onto the site: its elements are rebuilt natively in
   Consultation.astro (molecule wireframe + glowing title + helix). */

async function crop(file, fr, dest) {
  const meta = await sharp(file).metadata();
  const left = Math.round(fr[0] * meta.width);
  const width = Math.round((fr[1] - fr[0]) * meta.width);
  const top = Math.round(fr[2] * meta.height);
  const height = Math.round((fr[3] - fr[2]) * meta.height);
  await sharp(file)
    .extract({ left, top, width, height })
    // contain, never cover: the full person stays visible, and the page-bg
    // letterbox disappears against the composites' black backgrounds
    .resize(1200, 1600, { fit: 'contain', background: '#0a080e' })
    .png({ compressionLevel: 9 })
    .toFile(dest);
  console.log(`${dest}  (from ${width}x${height} panel)`);
}

await mkdir(OUT, { recursive: true });
for (const c of COMPOSITES) {
  if (!existsSync(c.file)) {
    console.warn(`skip: ${c.file} not found`);
    continue;
  }
  await crop(c.file, c.left, `${OUT}/${c.out}-before.png`);
  await crop(c.file, c.right, `${OUT}/${c.out}-after.png`);
}
for (const s of SINGLES) {
  if (!existsSync(s.file)) {
    console.warn(`skip: ${s.file} not found`);
    continue;
  }
  if (s.fr) {
    await crop(s.file, s.fr, `${OUT}/${s.dest}.png`);
    continue;
  }
  let img = sharp(s.file);
  if (s.cut) img = img.trim(); // drop the cutout's transparent margins
  await img
    .resize(1200, 1600, { fit: 'contain', background: '#0a080e' })
    .flatten({ background: '#0a080e' })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${s.dest}.png`);
  console.log(`${OUT}/${s.dest}.png  (single photo${s.cut ? ', cutout' : ''})`);
}
console.log('Done. Run the image pipeline next (see header comment).');
