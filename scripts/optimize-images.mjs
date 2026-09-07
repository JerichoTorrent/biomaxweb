#!/usr/bin/env node
/**
 * optimize-images.mjs
 *
 * Converts source images to AVIF + WebP at responsive widths and prints
 * ready-to-paste srcset markup plus a byte-size report.
 *
 * Usage:
 *   node optimize-images.mjs <file-or-dir> [options]
 *
 * Options:
 *   --outdir   <path>    output directory      (default: public/img)
 *   --widths   <list>    comma-separated       (default: 400,800,1200,1600)
 *   --quality  <n>       AVIF quality 1-100    (default: 62)
 *   --sizes    <str>     sizes attr for output (default: 100vw)
 *   --no-webp            skip WebP, AVIF only
 *
 * Requires: npm i -D sharp
 */

import { readdir, mkdir, stat } from 'node:fs/promises';
import { join, basename, extname, resolve } from 'node:path';
import process from 'node:process';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('sharp is not installed. Run:  npm i -D sharp');
  process.exit(1);
}

const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);

// Per-image ceiling and total page budget, in bytes.
const MAX_SINGLE = 150 * 1024;
const MAX_TOTAL = 600 * 1024;

function parseArgs(argv) {
  const opts = {
    input: null,
    outdir: 'public/img',
    widths: [400, 800, 1200, 1600],
    quality: 62,
    sizes: '100vw',
    webp: true,
  };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--outdir') opts.outdir = rest[++i];
    else if (a === '--widths') opts.widths = rest[++i].split(',').map(n => parseInt(n.trim(), 10));
    else if (a === '--quality') opts.quality = parseInt(rest[++i], 10);
    else if (a === '--sizes') opts.sizes = rest[++i];
    else if (a === '--no-webp') opts.webp = false;
    else if (!a.startsWith('--')) opts.input = a;
  }
  return opts;
}

async function collect(input) {
  const s = await stat(input);
  if (s.isFile()) return [input];
  const entries = await readdir(input);
  return entries
    .filter(f => RASTER.has(extname(f).toLowerCase()))
    .map(f => join(input, f));
}

const kb = b => `${(b / 1024).toFixed(1)}KB`;

async function processOne(file, opts) {
  const name = basename(file, extname(file));
  const img = sharp(file);
  const meta = await img.metadata();

  // Never upscale — a 900px source gets 400 and 800, not 1200.
  const widths = opts.widths.filter(w => w <= meta.width).sort((a, b) => a - b);
  if (widths.length === 0) widths.push(meta.width);

  const results = { name, meta, avif: [], webp: [], bytes: 0, largest: 0 };

  for (const w of widths) {
    const base = sharp(file).resize({ width: w, withoutEnlargement: true });

    const avifPath = join(opts.outdir, `${name}-${w}.avif`);
    const avifInfo = await base
      .clone()
      .avif({ quality: opts.quality, effort: 6 })
      .toFile(avifPath);
    results.avif.push({ w, path: avifPath, size: avifInfo.size });
    results.bytes += avifInfo.size;
    results.largest = Math.max(results.largest, avifInfo.size);

    if (opts.webp) {
      const webpPath = join(opts.outdir, `${name}-${w}.webp`);
      const webpInfo = await base
        .clone()
        .webp({ quality: Math.min(opts.quality + 12, 90) })
        .toFile(webpPath);
      results.webp.push({ w, path: webpPath, size: webpInfo.size });
    }
  }

  return results;
}

function toSrcset(entries) {
  return entries.map(e => `/${e.path.replace(/^public\//, '')} ${e.w}w`).join(', ');
}

function printMarkup(r, opts) {
  const mid = r.webp.length
    ? r.webp[Math.floor(r.webp.length / 2)]
    : r.avif[Math.floor(r.avif.length / 2)];
  const src = `/${mid.path.replace(/^public\//, '')}`;

  console.log(`\n\x1b[1m${r.name}\x1b[0m  (source ${r.meta.width}x${r.meta.height})`);
  console.log('  <picture>');
  console.log(`    <source type="image/avif" srcset="${toSrcset(r.avif)}" sizes="${opts.sizes}">`);
  if (r.webp.length) {
    console.log(`    <source type="image/webp" srcset="${toSrcset(r.webp)}" sizes="${opts.sizes}">`);
  }
  console.log(`    <img src="${src}" width="${r.meta.width}" height="${r.meta.height}" alt="TODO" loading="lazy" decoding="async">`);
  console.log('  </picture>');

  const sizeList = r.avif.map(e => `${e.w}w ${kb(e.size)}`).join('  ');
  console.log(`  avif: ${sizeList}`);

  if (r.largest > MAX_SINGLE) {
    console.log(`  \x1b[33m! largest variant ${kb(r.largest)} exceeds the ${kb(MAX_SINGLE)} per-image ceiling — lower --quality or drop the top width\x1b[0m`);
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.input) {
    console.error('Usage: node optimize-images.mjs <file-or-dir> [--outdir p] [--widths a,b,c] [--quality n] [--sizes str]');
    process.exit(1);
  }

  await mkdir(opts.outdir, { recursive: true });
  const files = await collect(resolve(opts.input));
  if (!files.length) {
    console.error('No raster images found.');
    process.exit(1);
  }

  console.log(`Processing ${files.length} image(s) → ${opts.outdir}  (quality ${opts.quality})`);

  let total = 0;
  for (const f of files) {
    try {
      const r = await processOne(f, opts);
      printMarkup(r, opts);
      // Count only the largest AVIF per image toward the page budget — that
      // approximates what a desktop browser actually downloads.
      total += r.largest;
    } catch (err) {
      console.error(`  \x1b[31mfailed: ${f} — ${err.message}\x1b[0m`);
    }
  }

  console.log(`\n\x1b[1mEstimated page image payload: ${kb(total)}\x1b[0m  (budget ${kb(MAX_TOTAL)})`);
  if (total > MAX_TOTAL) {
    console.log('\x1b[31mOver budget. Reduce quality, drop the largest width, or ship fewer images above the fold.\x1b[0m');
    process.exitCode = 1;
  } else {
    console.log('\x1b[32mWithin budget.\x1b[0m');
  }

  console.log('\nReminders: set a real alt attribute, fix `sizes` to match the actual layout,');
  console.log('and remove loading="lazy" from the LCP image.');
}

main();
