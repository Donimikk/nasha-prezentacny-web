# Nasha presentation site — build and deploy design

Date: 2026-10-10 · Status: draft for review

## Goal
Turn the approved mockup `docs/mockups/e-final.html` into a deployable static website and
publish it on Render as a free Static Site at `*.onrender.com`. The site is mainly a portfolio
piece; real traffic is expected to be low.

## Decisions already made
- Plain HTML / CSS / JS, no framework, no build step (same approach as Skejul's front end).
- Hosting: Render Static Site in "Dominik's workspace" (Hobby, free). No custom domain.
- Content (texts, prices, hours, photos) is approved; photo consent obtained.
- Content is edited by Dominik directly in the HTML. A CMS/dashboard is out of scope.
- Mockups A–E stay in `docs/mockups/` as an archive and are not deployed.

## Repository layout
```
site/                     ← the only folder Render publishes
  index.html              ← from e-final.html, paths rewritten
  css/site.css            ← shared.css + the page's inline <style>, merged
  js/decanter.js          ← pour-over animation (unchanged logic)
  js/lineart.js           ← line-art objects + depth field (unchanged logic)
  js/map.js               ← click-to-load Google Maps (moved out of inline script)
  img/                    ← optimised photos (WebP) + logos (SVG) + favicon
  404.html                ← small branded "page not found"
scripts/optimize_images.py  ← one-off: source photos → site/img/*.webp
docs/                     ← research, mockups, specs (not deployed)
assets/                   ← source photos and logos (not deployed)
```
`assets/instagram/` (originals) stays gitignored; only the optimised copies used by the page
are committed under `site/img/`.

## Images
- Script `scripts/optimize_images.py` (Pillow, already installed) reads a list of the photos the
  page uses, writes WebP into `site/img/` with readable names (e.g. `bar-faema.webp`,
  `cake-caramel.webp`), resizes the long edge to 1600 px (strip/band photos) or 1000 px (cards),
  quality ~80, strips EXIF.
- Each `<img>` gets `width`/`height` (no layout shift), `loading="lazy"` below the hero,
  `decoding="async"`, and the existing alt text.
- Target: total image weight of the page ≤ 1.5 MB (today 3.44 MB from originals). Measured, not assumed.
- The Ivona + Peťo portrait and the latte photo are only ~437 px wide; used as-is until originals arrive.

## Page content and behaviour
- Same sections, copy and layout as `e-final.html` today (including Dominik's own edits).
- Fonts: Google Fonts (Quicksand, Montserrat) as in the mockup, with `preconnect`.
- Animations: decanter pour + line-art depth field; both respect `prefers-reduced-motion`.
- Map: Google Maps iframe loaded only after a click (no third-party request before that).
- Instagram strip: static images linking to the profile (no Instagram embed/API).

## SEO and sharing basics
- `<html lang="sk">`, `<title>Nasha kaviareň · Vranov nad Topľou</title>`, meta description.
- Open Graph title/description/image (one optimised photo) for link previews.
- Favicon from `assets/brand/favicon.svg`.
- `robots.txt` allowing indexing (portfolio piece, but public café info is fine to index).

## Render setup
Created through the Render MCP (`create_static_site`), mirroring `nasha-kaviaren-front`:
- name `nasha-prezentacny-web` (subdomain `nasha-prezentacny-web.onrender.com` if free)
- repo `github.com/Donimikk/nasha-prezentacny-web`, branch `main`, auto-deploy on commit
- build command `echo "No build needed"`, publish path `site`
- PR previews off. No env vars, no secrets, no `render.yaml`.

## Git
- First commit contains: `site/`, `scripts/`, `docs/` (research, mockups, specs), `assets/brand/`,
  `.gitignore`, `.claude/settings.json`, `README.md`.
- Not committed: `WORKLOG.md`, `.remember/`, `.playwright-mcp/`, `assets/instagram/`,
  `docs/ig-*.json`.
- Mockups keep referencing `../../assets/...`; `assets/brand/illustration/` is committed so the
  archive still renders. `assets/instagram/` originals are not, so mockups lose those photos on
  GitHub — acceptable (archive only).
- Commit and push only after Dominik's OK. Commit message style: short imperative English
  (repo has no history yet). No AI attribution lines.

## README
Short English README: what the site is, how to run it locally (`python -m http.server` in
`site/`), where content lives, how deploys work (push to `main` → Render), and the image script.

## Verification
- Local: serve `site/`, headless Chrome screenshots at 1440, 1180 and 390 px; compare with the mockup.
- Check: no console errors, every image path resolves (script lists 404s), total page weight
  measured, HTML tag balance check, map click loads the iframe.
- After deploy: open the onrender.com URL, check deploy status and logs via the Render MCP,
  repeat the screenshot check against the live URL.

## Out of scope
Custom domain, CMS / admin dashboard, analytics, contact form, cookie banner (nothing is set
before the map click), multilingual version, the second café location.

## Open points (do not block the build)
- Original-resolution photos of Ivona + Peťo and the latte art.
- A photo of the grinders (section "Dva mlynčeky" uses the bar photo for now).
