# Setup guide

Everything needed to run, edit, and host biomaxxer.com. Ten minutes from
unzip to a running site.

## 1. What you have

A static website: the build step turns the source into plain HTML, CSS, images,
and one small JavaScript file. There is no database, no backend, and nothing to
keep running except a web server that hands out files. That is why it is fast
and why it is cheap to host anywhere.

## 2. Prerequisites

| Tool   | Version  | Why                                    | Get it                          |
| ------ | -------- | -------------------------------------- | ------------------------------- |
| Node   | 22 or newer | builds the site, runs the dev server | https://nodejs.org (LTS)        |
| npm    | comes with Node | installs dependencies           |                                 |
| Docker | any recent | hosting on your own server (optional) | https://docs.docker.com/get-docker |

Check with `node -v` and `docker -v`.

## 3. Run it locally

```bash
unzip biomaxxer-site.zip -d biomaxxer
cd biomaxxer
npm install
npm run dev
```

Open http://localhost:4321. Edits to any file show up live in the browser.

## 4. Make changes

Copy, prices, links, FAQ answers, and reviews are all plain files — see
**"Editing the site yourself"** in `README.md` for the exact file per section.
No programming needed for text changes.

After any change, run the full check before publishing:

```bash
npm run check
```

It builds the site and audits it against the performance budget. It must end
with `PASS`. If it fails, the message says which file is over budget.

## 5. Host it

### Option A — your own server with Docker (recommended, as specified)

On a server with Docker installed, from inside the project folder:

```bash
docker compose up --build -d
```

That builds a production image (nginx with brotli/gzip and correct caching)
and serves the site on port **8080**. Verify with `curl -I localhost:8080`.

Two things remain on the server side:

1. **DNS** — at your domain registrar, point an `A` record for `biomaxxer.com`
   (and `www`) at the server's IP.
2. **HTTPS** — put a TLS-terminating reverse proxy in front of port 8080.
   Caddy is the least effort; this complete `Caddyfile` gets automatic
   certificates:

   ```
   biomaxxer.com, www.biomaxxer.com {
       reverse_proxy localhost:8080
   }
   ```

To update the live site later: pull in the new files, then run the same
`docker compose up --build -d` again. The old container is replaced with no
downtime worth noticing.

### Option B — a static host (Vercel, Netlify, Cloudflare Pages)

The site is a standard static build, so any static host works:

- Build command: `npm run build`
- Output directory: `dist`

Connect the domain in that host's dashboard. You lose the tuned nginx config
from Option A, but these hosts apply comparable compression and caching.

## 6. After launch

- **Google Search Console** — add the domain and submit the sitemap at
  `https://biomaxxer.com/sitemap-index.xml` so Google indexes it quickly.
- **PageSpeed Insights** — https://pagespeed.web.dev, run on the live URL.
  Expect 100 across the board on mobile; if a score drops after an edit,
  `npm run check` will usually point to the cause (an oversized image).
- **Disclaimer** — the footer text lives in `src/config.ts` (`DISCLAIMER`).
  It ships as a draft; replace it with counsel-approved wording.
- **Video captions** — `public/video/hero-ad.en.vtt` is a placeholder track.
  Drop in the real transcript for accessibility.

## 7. If something goes wrong

| Symptom                              | Fix                                                        |
| ------------------------------------ | ---------------------------------------------------------- |
| `npm install` errors                 | Node too old — install Node 22+ and retry                  |
| Fonts look wrong on your own server  | Use the provided `nginx.conf`; it sets the `.woff2` MIME type |
| `npm run check` says FAIL            | Read the line it flags; usually an image needs re-running through `npm run images` |
| Video won't play in Chrome           | Only H.264 MP4s are supported; re-encode per `README.md` "Video" |
| Port 8080 already in use             | Change the left-hand port in `docker-compose.yml`, e.g. `8081:80` |
