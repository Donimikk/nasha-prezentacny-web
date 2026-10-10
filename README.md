# Nasha kaviareň — presentation site

Static website for Nasha kaviareň, a specialty coffee shop with its own roastery in
Vranov nad Topľou (Slovakia). Plain HTML, CSS and JavaScript — no framework, no build step.

## Structure
- `site/` — the published website (Render serves this folder)
- `scripts/optimize_images.py` — converts source photos to WebP in `site/img/`
- `scripts/check_site.py` — checks links, image attributes, tag balance and page weight
- `docs/` — research, design mockups, spec and plan (not published)
- `assets/` — source photos and logos (not published)

## Run locally
    cd site
    python -m http.server 8000
Open http://localhost:8000.

## Checks
    python -m pip install -r requirements-dev.txt
    python -m pytest
    python scripts/check_site.py site

## Deploy
Every push to `main` is deployed by Render (Static Site, publish path `site`, no build command).
