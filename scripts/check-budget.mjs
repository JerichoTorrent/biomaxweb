#!/usr/bin/env node
/**
 * check-budget.mjs
 *
 * Static audit of a built static site against the project performance budget.
 * Deterministic, fast, no browser required. Catches the regressions that
 * commonly cost Lighthouse points; does not replace a real Lighthouse run.
 *
 * Usage:
 *   node check-budget.mjs [dist-dir]        (default: dist)
 *
 * Exits non-zero if any budget is breached, so it can gate a deploy.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import process from 'node:process';

const DIST = process.argv[2] || 'dist';

const BUDGET = {
  jsCompressed: 50 * 1024,     // total JS, gzipped
  cssCompressed: 30 * 1024,    // total CSS, gzipped
  images: 600 * 1024,          // total image weight
  fonts: 120 * 1024,           // total font weight
  pageTotal: 1024 * 1024,      // everything that loads with the page
  // Self-hosted video is click-to-load (preload="none") — zero bytes on page
  // load, so it gets its own ceiling instead of counting against pageTotal.
  video: 12 * 1024 * 1024,
};

const EXT = {
  js: ['.js', '.mjs'],
  css: ['.css'],
  img: ['.avif', '.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg'],
  font: ['.woff2', '.woff', '.ttf', '.otf'],
  video: ['.mp4', '.webm'],
  html: ['.html'],
};

const kb = b => `${(b / 1024).toFixed(1)}KB`;
const red = s => `\x1b[31m${s}\x1b[0m`;
const green = s => `\x1b[32m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const bold = s => `\x1b[1m${s}\x1b[0m`;

async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    console.error(red(`Cannot read ${dir} — did you run the build first?`));
    process.exit(1);
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function classify(file) {
  const e = extname(file).toLowerCase();
  for (const [kind, exts] of Object.entries(EXT)) {
    if (exts.includes(e)) return kind;
  }
  return 'other';
}

const problems = [];

async function auditHtml(file) {
  const html = await readFile(file, 'utf8');
  const rel = relative(DIST, file);

  // <img> without both width and height — the main CLS source.
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imgs) {
    const hasW = /\bwidth\s*=/.test(tag);
    const hasH = /\bheight\s*=/.test(tag);
    if (!hasW || !hasH) {
      const src = (tag.match(/src\s*=\s*["']([^"']+)/i) || [])[1] || '(inline)';
      problems.push(`${rel}: <img> missing ${!hasW ? 'width' : ''}${!hasW && !hasH ? '/' : ''}${!hasH ? 'height' : ''} — ${src}`);
    }
    // bare `alt` (no value) is valid HTML for a decorative image — same as alt=""
    if (!/\balt\b/.test(tag)) {
      const src = (tag.match(/src\s*=\s*["']([^"']+)/i) || [])[1] || '(inline)';
      problems.push(`${rel}: <img> missing alt — ${src}`);
    }
  }

  // Third-party iframes: the single biggest score risk on this project.
  const iframes = html.match(/<iframe\b[^>]*>/gi) || [];
  for (const tag of iframes) {
    const src = (tag.match(/src\s*=\s*["']([^"']+)/i) || [])[1] || '';
    if (src && !src.startsWith('/')) {
      problems.push(`${rel}: third-party iframe (${src.slice(0, 60)}) — use a click-to-load facade`);
    }
  }

  // Render-blocking scripts in <head>.
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
  const blocking = (head.match(/<script\b(?![^>]*\b(?:async|defer|type=["']module["']))[^>]*\bsrc=/gi) || []);
  if (blocking.length) {
    problems.push(`${rel}: ${blocking.length} render-blocking <script> in <head> — add defer or type="module"`);
  }

  // Remote font stylesheets.
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html)) {
    problems.push(`${rel}: remote Google Fonts request — self-host and subset instead`);
  }

  // SEO essentials.
  if (!/<title>[^<]{3,}<\/title>/i.test(html)) problems.push(`${rel}: missing or empty <title>`);
  if (!/<meta\s+name=["']description["']/i.test(html)) problems.push(`${rel}: missing meta description`);
  if (!/<link\s+rel=["']canonical["']/i.test(html)) problems.push(`${rel}: missing canonical link`);
  if (!/<meta\s+property=["']og:image["']/i.test(html)) problems.push(`${rel}: missing og:image`);

  const h1s = (html.match(/<h1\b/gi) || []).length;
  if (h1s === 0) problems.push(`${rel}: no <h1>`);
  if (h1s > 1) problems.push(`${rel}: ${h1s} <h1> elements — should be exactly one`);
}

async function main() {
  const files = await walk(DIST);
  const totals = { js: 0, css: 0, img: 0, font: 0, video: 0, html: 0, other: 0 };
  const compressed = { js: 0, css: 0 };
  const bigImages = [];
  // Responsive images ship as <base>-<width>.{avif,webp} ladders, but a
  // browser downloads ONE format at ONE width. Matching the image pipeline's
  // methodology ("count only the largest AVIF per image"), images are
  // grouped per source and the largest AVIF (else largest file) counts.
  const imgGroups = new Map();

  for (const f of files) {
    const kind = classify(f);
    const { size } = await stat(f);

    if (kind === 'img') {
      const base = relative(DIST, f).replace(/-\d+\.(avif|webp|jpe?g|png)$/i, '');
      const g = imgGroups.get(base) ?? { avif: 0, any: 0 };
      if (extname(f).toLowerCase() === '.avif') g.avif = Math.max(g.avif, size);
      g.any = Math.max(g.any, size);
      imgGroups.set(base, g);
    } else {
      totals[kind] += size;
    }

    if (kind === 'js' || kind === 'css') {
      compressed[kind] += gzipSync(await readFile(f)).length;
    }
    if (kind === 'img' && size > 150 * 1024) {
      bigImages.push([relative(DIST, f), size]);
    }
    if (kind === 'html') await auditHtml(f);
  }

  for (const g of imgGroups.values()) {
    totals.img += g.avif || g.any;
  }

  // Click-to-load video is excluded from the page-load total (see BUDGET).
  const pageTotal =
    Object.values(totals).reduce((a, b) => a + b, 0) - totals.video;

  console.log(bold(`\nBuild audit — ${DIST}  (${files.length} files)\n`));

  const rows = [
    ['JS (gzipped)', compressed.js, BUDGET.jsCompressed],
    ['CSS (gzipped)', compressed.css, BUDGET.cssCompressed],
    ['Images', totals.img, BUDGET.images],
    ['Fonts', totals.font, BUDGET.fonts],
    ['Video (on click)', totals.video, BUDGET.video],
    ['Total (page load)', pageTotal, BUDGET.pageTotal],
  ];

  let over = false;
  for (const [label, actual, budget] of rows) {
    const ok = actual <= budget;
    if (!ok) over = true;
    const pct = ((actual / budget) * 100).toFixed(0);
    console.log(
      `  ${label.padEnd(16)} ${kb(actual).padStart(9)} / ${kb(budget).padStart(9)}  ${
        ok ? green(`${pct}%`) : red(`${pct}%  OVER`)
      }`
    );
  }

  if (bigImages.length) {
    console.log(yellow('\n  Images over the 150KB per-file ceiling:'));
    for (const [p, s] of bigImages.sort((a, b) => b[1] - a[1])) {
      console.log(`    ${kb(s).padStart(9)}  ${p}`);
    }
  }

  if (problems.length) {
    console.log(red(`\n  ${problems.length} correctness issue(s):`));
    for (const p of problems) console.log(`    - ${p}`);
  }

  const failed = over || problems.length > 0;
  console.log(
    failed
      ? red('\nFAIL — fix the above before deploying.\n')
      : green('\nPASS — within budget. Confirm with a real Lighthouse run before delivery.\n')
  );
  process.exit(failed ? 1 : 0);
}

main();
