# Assets needed from the client

Updated 2026-08-25 after the first content drop ("masters" folder).
Most launch assets are now live on the site. Placeholders in the codebase are
written as `{{LIKE_THIS}}` (`grep -r "{{" src` lists what is still pending).

## Still blocking for launch

| # | Item | What is needed | Where it goes |
|---|------|----------------|---------------|
| 1 | **Disclaimer sign-off** | The footer now carries DRAFT boilerplate ("educational purposes only, not medical advice, not a licensed physician, results vary"). **This draft has not been reviewed by counsel.** You or your counsel must approve it, or send replacement wording, before launch. The text lives in `src/config.ts` (`DISCLAIMER`). | `src/config.ts` |
| 2 | **Video captions / transcript** | The hero video is live, but the captions file is a placeholder. Send a transcript (plain text is fine; we convert to VTT). Required for the accessibility score and for viewers watching muted. | `public/video/hero-ad.en.vtt` |

## Received and live ✓

- **Hero video** — the web encode from your "hero for biomaxxing" kit
  (H.264 720p, 11.7MB, plays everywhere) is live at
  `public/video/hero-ad.mp4`, click-to-play.
  **Note: the ad runs 1:57 against the agreed ≤60s cap** — fine technically,
  but confirm you want the full cut; a 45–60s edit would likely convert
  better on a hero.
- **Poster frame** — responsive set from the 3-second mark of the ad
  (mid-sentence, overlay legible), regenerated through the site's image
  pipeline at 640/960/1280.
- **Transformation pairs (3 of max 8)** — jaw/facial (Turkish Prince),
  posture/frame (Conlan), physique (Gawdsliq), cropped from your composites
  into the sliders. Name banners are excluded from the crops. A fourth pair
  (DJ) is cropped and ready in `assets-src/client-pairs-extra/` — say where
  you want it. **Category mapping was our call — swap if wrong** (it's a
  one-line change in `scripts/crop-composites.mjs`).
- **Discord invite** — https://discord.gg/FDTmu2QrMa (from your hoo.be).
- **Social links** — YouTube, Instagram, TikTok, X pulled from your hoo.be
  into `/links`, the footer, and the Organization schema.
- **Amazon storefront** — listed under Partners with `rel="sponsored"`.
- **Domain** — biomaxxer.com wired into canonicals, sitemap, robots, OG tags.
- **Stripe checkout** — the live $120 consultation link is wired into every
  consultation button (received 2026-08-25).

## Content to review / replace before launch

| # | Item | Count / caps | Status |
|---|------|--------------|--------|
| 4 | **Testimonials** | Up to **12** | **Real now**: the 3 written five-star reviews on your Skool about page (Calvin B., Charles W., Alex V.) were pulled in on 2026-08-25; the one long review is trimmed at sentence boundaries, wording untouched. Send more (screenshots fine) any time. |
| 5 | **FAQ answers** | Up to **12** | 10 placeholder Q&As in `src/content/faq.json`. Review for accuracy about your offer — especially the cancellation-policy answer. |
| 6 | **More transformation pairs** | Cap **8 pairs** total | Optional. Composites like the ones you sent are perfect; portrait singles ≥1200×1600 also work. |
| 7 | **Sponsor/partner links** | Cap **20 links** total on /links | Amazon is live. For each additional partner send: display name, URL, one-line offer. Copy the `amazon` block in `src/content/links.json`. |
| 8 | **Free resources** | — | If a starter-protocol PDF or newsletter exists, send URLs and we re-add those rows to /links. |
| 9 | **Open Graph image** *(optional)* | 1200×630 | A generated branded card ships now; a custom one can replace `public/img/og-default.jpg`. |

## Notes

- Asset masters (the folder you dropped) stay out of git; keep your own copy.
- After any swap the site is rebuilt (`docker compose up --build -d`) — the
  build validates formats and fails loudly rather than publishing mistakes.
