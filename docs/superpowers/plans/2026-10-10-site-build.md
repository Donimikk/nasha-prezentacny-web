# Nasha presentation site — build and deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `docs/mockups/e-final.html` into a static site in `site/` and publish it as a free Render Static Site.

**Architecture:** Plain HTML/CSS/JS with no build step. A stdlib checker (`scripts/check_site.py`) guards paths, image attributes, tag balance and page weight; a Pillow script produces WebP images; a one-off migration script turns the mockup into `site/index.html`. Render publishes `site/` on every push to `main`.

**Tech Stack:** HTML, CSS, vanilla JS; Python 3.14 stdlib (`html.parser`) + Pillow 12 (already installed); pytest (dev only, `requirements-dev.txt`, same as in Skejul); headless Chrome for screenshots; Render MCP for the static site.

**Spec:** `docs/superpowers/specs/2026-10-10-site-build-design.md`

## Global Constraints
- No framework, no build step. Runtime: none (static files). Dev tools: Pillow + pytest only.
- Render: static site, build command `echo "No build needed"`, publish path `site`, branch `main`, auto-deploy on commit, PR previews off, no env vars, no `render.yaml`.
- Total image weight of `index.html` ≤ 1.5 MB (1 572 864 bytes).
- File names under `site/`: lowercase ASCII, digits, `-`, `_`, `.` only (Render runs on Linux: paths are case-sensitive).
- Copy, prices, hours and layout exactly as in `docs/mockups/e-final.html` (it contains Dominik's own edits — do not rewrite text).
- Not committed: `WORKLOG.md`, `.remember/`, `.playwright-mcp/`, `assets/instagram/`, `docs/ig-*.json`.
- Commit messages: short imperative English, no AI attribution lines. First push only after Dominik's OK.
- Code comments and docs in English.

## Review Focus
1. Path case mismatch (`Img/Foo.webp` vs `img/foo.webp`) works on Windows but 404s on Render → checker compares exact names from `os.listdir` (test in Task 1).
2. A referenced file that does not exist, including `data-logo` on the decanter and `url()` in CSS → checker reports it (tests in Task 1).
3. A path escaping `site/` (`../../assets/...` left over from the mockup) → checker rejects it (test in Task 1).
4. Images without `width`/`height` cause layout shift on slow mobile → checker requires both on every `<img>` (test in Task 1).
5. Page heavier than budget after a photo swap → checker sums image bytes and fails over 1.5 MB (test in Task 1).

---

### Task 1: Site checker

**Files:**
- Create: `scripts/check_site.py`
- Create: `requirements-dev.txt` (`pytest`)
- Test: `tests/test_check_site.py`

**Interfaces:**
- Produces: `check_site(root: pathlib.Path, page: str = "index.html", image_budget: int = 1_572_864) -> list[str]` — returns problem strings, empty list = OK. Refs starting with `/` resolve from the site root (as on Render). CLI: `python scripts/check_site.py [root] [page]` exits 0 if OK, 1 otherwise, printing each problem and the measured image weight.

- [ ] **Step 0: Dev dependency**

`requirements-dev.txt`:
```
pytest
```
Run: `python -m pip install -r requirements-dev.txt`
Expected: pytest installed (`python -m pytest --version`).

- [ ] **Step 1: Write the failing tests** (unittest-style classes, collected by pytest)

`tests/test_check_site.py`:
```python
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from check_site import check_site  # noqa: E402

PAGE = """<!doctype html><html lang="sk"><head>
<link rel="stylesheet" href="css/site.css"></head><body><main>
<img src="img/a.webp" alt="a" width="10" height="10">
<div class="decanter" data-logo="img/logo.svg"></div>
<a href="#kava">x</a><a href="https://example.com">y</a>
</main><script src="js/app.js"></script></body></html>"""


class CheckSiteTest(unittest.TestCase):
    def make(self, page=PAGE, files=None, css="body{background:url(../img/bg.webp)}"):
        tmp = Path(tempfile.mkdtemp())
        (tmp / "index.html").write_text(page, encoding="utf-8")
        default = {"css/site.css": css.encode(), "js/app.js": b"", "img/a.webp": b"x" * 10,
                   "img/logo.svg": b"<svg/>", "img/bg.webp": b"x"}
        for rel, data in {**default, **(files or {})}.items():
            p = tmp / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            if data is not None:
                p.write_bytes(data)
        return tmp

    def test_valid_site_has_no_problems(self):
        self.assertEqual(check_site(self.make()), [])

    def test_missing_image(self):
        problems = check_site(self.make(files={"img/a.webp": None}))
        self.assertTrue(any("img/a.webp" in p and "missing" in p for p in problems), problems)

    def test_missing_data_logo(self):
        problems = check_site(self.make(files={"img/logo.svg": None}))
        self.assertTrue(any("img/logo.svg" in p for p in problems), problems)

    def test_missing_css_url(self):
        problems = check_site(self.make(files={"img/bg.webp": None}))
        self.assertTrue(any("img/bg.webp" in p for p in problems), problems)

    def test_case_mismatch(self):
        root = self.make(page=PAGE.replace("img/a.webp", "img/A.webp"))
        problems = check_site(root)
        self.assertTrue(any("img/A.webp" in p for p in problems), problems)

    def test_path_outside_root(self):
        root = self.make(page=PAGE.replace("img/a.webp", "../../assets/a.webp"))
        problems = check_site(root)
        self.assertTrue(any("outside" in p for p in problems), problems)

    def test_img_needs_size(self):
        root = self.make(page=PAGE.replace(' width="10" height="10"', ""))
        problems = check_site(root)
        self.assertTrue(any("width/height" in p for p in problems), problems)

    def test_img_needs_alt_attribute(self):
        root = self.make(page=PAGE.replace(' alt="a"', ""))
        problems = check_site(root)
        self.assertTrue(any("alt" in p for p in problems), problems)

    def test_unbalanced_tags(self):
        root = self.make(page=PAGE.replace("</main>", ""))
        problems = check_site(root)
        self.assertTrue(any("unbalanced" in p or "unclosed" in p for p in problems), problems)

    def test_image_budget(self):
        root = self.make(files={"img/a.webp": b"x" * 2000})
        problems = check_site(root, image_budget=1000)
        self.assertTrue(any("budget" in p for p in problems), problems)

    def test_root_absolute_path(self):
        root = self.make(page=PAGE.replace('src="img/a.webp"', 'src="/img/a.webp"'))
        self.assertEqual(check_site(root), [])

    def test_non_ascii_file_name(self):
        root = self.make(files={"img/káva.webp": b"x"})
        problems = check_site(root)
        self.assertTrue(any("file name" in p for p in problems), problems)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest tests/test_check_site.py -v`
Expected: collection ERROR — `ModuleNotFoundError: No module named 'check_site'`

- [ ] **Step 3: Write the checker**

`scripts/check_site.py`:
```python
"""Static checks for the published site folder.

Checks every local reference in the page (src, href, data-logo, CSS url()),
exact-case file existence (Render serves from Linux), paths that escape the
site root, <img> attributes, tag balance, file names and image weight.
Usage: python scripts/check_site.py [site_root]
"""
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

IMAGE_EXT = {".webp", ".jpg", ".jpeg", ".png", ".svg", ".gif"}
TRACKED = {"main", "header", "footer", "section", "div", "ul", "ol", "dl", "nav", "a", "p"}
VOID = {"img", "br", "hr", "meta", "link", "input", "source"}
NAME_OK = re.compile(r"^[a-z0-9._-]+$")


class _Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.imgs, self.stack, self.balance = [], [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for key in ("src", "href", "data-logo"):
            if a.get(key):
                self.refs.append(a[key])
        if tag == "img":
            self.imgs.append(a)
        if tag in TRACKED and tag not in VOID:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if tag not in TRACKED:
            return
        if self.stack and self.stack[-1][0] == tag:
            self.stack.pop()
        else:
            self.balance.append(f"unbalanced </{tag}> at line {self.getpos()[0]}")


def _is_local(ref):
    return not (ref.startswith(("http://", "https://", "//", "#", "mailto:", "tel:", "data:"))
                or ref.startswith("javascript:"))


def _exists_exact(root, rel_path):
    """True if every path component exists with exactly this spelling."""
    current = root
    for part in rel_path.parts:
        if part not in os.listdir(current):
            return False
        current = current / part
    return True


def _check_ref(root, base_dir, ref, problems):
    clean = ref.split("#")[0].split("?")[0]
    if clean.startswith("/"):          # root-relative, as served by Render
        base_dir, clean = root, clean.lstrip("/")
    target = (base_dir / clean).resolve()
    try:
        rel = target.relative_to(root.resolve())
    except ValueError:
        problems.append(f"{ref}: points outside the site folder")
        return None
    if not _exists_exact(root.resolve(), rel):
        problems.append(f"{ref}: missing (exact-case check)")
        return None
    return target


def check_site(root, page="index.html", image_budget=1_572_864):
    root = Path(root)
    problems = []
    parser = _Page()
    parser.feed((root / page).read_text(encoding="utf-8"))
    problems += parser.balance
    problems += [f"unclosed <{t}> from line {pos[0]}" for t, pos in parser.stack]

    image_bytes, seen = 0, set()
    for ref in parser.refs:
        if not _is_local(ref) or ref in seen:
            continue
        seen.add(ref)
        target = _check_ref(root, root, ref, problems)
        if target is None:
            continue
        if target.suffix.lower() in IMAGE_EXT:
            image_bytes += target.stat().st_size
        if target.suffix == ".css":
            for url in re.findall(r"url\(['\"]?([^'\")]+)['\"]?\)", target.read_text(encoding="utf-8")):
                if _is_local(url) and url not in seen:
                    seen.add(url)
                    hit = _check_ref(root, target.parent, url, problems)
                    if hit is not None and hit.suffix.lower() in IMAGE_EXT:
                        image_bytes += hit.stat().st_size

    for img in parser.imgs:
        src = img.get("src", "?")
        if "alt" not in img:
            problems.append(f"<img src={src}>: missing alt attribute")
        if not img.get("width") or not img.get("height"):
            problems.append(f"<img src={src}>: missing width/height")

    for path in root.rglob("*"):
        if path.is_file() and not NAME_OK.match(path.name):
            problems.append(f"{path.relative_to(root)}: file name must be lowercase ASCII")

    if image_bytes > image_budget:
        problems.append(f"images {image_bytes} B exceed budget {image_budget} B")
    check_site.last_image_bytes = image_bytes
    return problems


if __name__ == "__main__":
    site_root = Path(sys.argv[1] if len(sys.argv) > 1 else "site")
    page_name = sys.argv[2] if len(sys.argv) > 2 else "index.html"
    found = check_site(site_root, page_name)
    for line in found:
        print("FAIL", line)
    print(f"images: {check_site.last_image_bytes / 1024:.0f} KB")
    sys.exit(1 if found else 0)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python -m pytest tests/test_check_site.py -v`
Expected: `12 passed`

- [ ] **Step 5: Stage (no commit yet — first commit happens in Task 4)**

```bash
git add requirements-dev.txt scripts/check_site.py tests/test_check_site.py
```

---

### Task 2: Optimised images

**Files:**
- Create: `scripts/optimize_images.py`
- Output: `site/img/*.webp`, `site/img/og.jpg`, `site/img/nasha-logo.svg`, `site/img/nasha-logo-blue.svg`, `site/img/favicon.svg`

**Interfaces:**
- Produces: the file names in `MANIFEST` below; Task 3 rewrites mockup paths with the same mapping (`MANIFEST` is imported by the migration script).

- [ ] **Step 1: Write the script**

`scripts/optimize_images.py`:
```python
"""Source photos -> resized WebP files in site/img/.

MANIFEST maps a source path (relative to the repo root) to the output name and
the maximum long edge in pixels. Run from the repo root:
    python scripts/optimize_images.py
"""
import shutil
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "site" / "img"
IG = "assets/instagram/"
IL = "assets/brand/illustration/"

# source -> (output name, max long edge)
MANIFEST = {
    "assets/photos/latte-dvojica.jpg": ("latte-dvojica.webp", 1000),
    IL + "d1831ee7-0aa1-44e9-9e05-5295d7d721f6.jfif": ("okno-bar.webp", 1400),
    IG + "03-DObAWNIjJ2h.jpg": ("latte-tulipan.webp", 1000),
    IL + "ad9c4c7d-6df8-4285-acfc-68d000f8d489.jfif": ("police-kava.webp", 1400),
    IL + "c0ce1a3e-902f-414f-8a56-771a142967e6.jfif": ("vrecia-zelena-kava.webp", 900),
    IG + "04-DMAacgosCMS.jpg": ("bar-faema.webp", 1200),
    IG + "20-CoJ7cQTIo_a.jpg": ("faema-detail.webp", 900),
    IG + "31-Ci9RJTyNF1w.jpg": ("origami-mletie.webp", 900),
    IG + "11-CwRpuGDIQ1b.jpg": ("limonady.webp", 900),
    IG + "12-CwM7_6jocLg.jpg": ("limonada-priprava.webp", 900),
    IG + "30-Cjzd2LPI5je.jpg": ("matcha-latte.webp", 900),
    IG + "29-Cj5XUPSopsS.jpg": ("beetroot-latte.webp", 900),
    IG + "02-DPZRYrwDC6p.jpg": ("horuca-cokolada.webp", 800),
    IL + "6f98a6dd-9f14-457d-aae3-8ce3701df8d5.jfif": ("kolac-karamel.webp", 1400),
    IG + "08-C4cg5y4oDBi.jpg": ("pecivo.webp", 900),
    "assets/photos/ivona-peter.jpg": ("ivona-peto.webp", 1000),
    IG + "06-DFFQgU3oZpn.jpg": ("cupping.webp", 900),
    IG + "01-DeD6ZGAKQSu.jpg": ("peto-aeropress.webp", 900),
    # Instagram strip (shown 260 px tall)
    IG + "14-CsV0dKPo4s7.jpg": ("ig-cappuccino.webp", 640),
    IG + "21-Cnv_1sfoEQZ.jpg": ("ig-origami.webp", 640),
    IG + "22-CmERMLZITEG.jpg": ("ig-zimny-napoj.webp", 640),
    IG + "25-CkXdfcwom6m.jpg": ("ig-sproud.webp", 640),
    IG + "28-Cj9_nogIMc9.jpg": ("ig-kakauko.webp", 640),
    IG + "19-Cpeuk2IIiZJ.jpg": ("ig-limonada.webp", 640),
    IG + "09-C0I4hChIVsS.jpg": ("ig-matcha.webp", 640),
    IG + "15-Cq7eh5uImTf.jpg": ("ig-macchiato.webp", 640),
    IG + "27-CkAimBwI3gK.jpg": ("ig-horuca-limonada.webp", 640),
    IG + "18-CqAyB5jowqE.jpg": ("ig-faema-salka.webp", 640),
}
LOGOS = ["assets/brand/nasha-logo.svg", "assets/brand/nasha-logo-blue.svg", "assets/brand/favicon.svg"]
OG_SOURCE = IL + "ad9c4c7d-6df8-4285-acfc-68d000f8d489.jfif"


def convert(src, name, edge):
    with Image.open(ROOT / src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((edge, edge))
        im.save(OUT / name, "WEBP", quality=80, method=6)
        return im.size


def make_og():
    # 1200x630 JPEG for link previews (crawlers handle JPEG best)
    with Image.open(ROOT / OG_SOURCE) as im:
        im = ImageOps.fit(ImageOps.exif_transpose(im).convert("RGB"), (1200, 630), centering=(0.5, 0.45))
        im.save(OUT / "og.jpg", "JPEG", quality=82, optimize=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for src, (name, edge) in MANIFEST.items():
        w, h = convert(src, name, edge)
        size = (OUT / name).stat().st_size
        total += size
        print(f"{name:28} {w}x{h} {size / 1024:6.0f} KB")
    for logo in LOGOS:
        shutil.copy2(ROOT / logo, OUT / Path(logo).name)
    make_og()
    print(f"total webp: {total / 1024:.0f} KB")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

Run: `python scripts/optimize_images.py`
Expected: 28 lines with sizes, `total webp:` printed, files in `site/img/` (28 `.webp`, `og.jpg`, 3 `.svg`).

- [ ] **Step 3: Check the budget**

Run: `python -c "import pathlib; print(sum(p.stat().st_size for p in pathlib.Path('site/img').glob('*.webp'))/1024, 'KB')"`
Expected: well under 1 536 KB. If over, lower the edge of the largest files in `MANIFEST` and rerun Step 2.

- [ ] **Step 4: Stage**

```bash
git add scripts/optimize_images.py site/img
```

---

### Task 3: `site/` from the mockup

**Files:**
- Create (scratch, not committed): `<scratchpad>/migrate_mockup.py`
- Create: `site/index.html`, `site/css/site.css`, `site/js/decanter.js`, `site/js/lineart.js`, `site/js/map.js`, `site/404.html`, `site/robots.txt`

**Interfaces:**
- Consumes: `MANIFEST` from `scripts/optimize_images.py`; `check_site()` from Task 1.
- Produces: the deployable `site/` folder.

- [ ] **Step 1: Run the checker on the empty site (must fail)**

Run: `python scripts/check_site.py site`
Expected: exit 1 with `FileNotFoundError` for `site/index.html` (the page does not exist yet).

- [ ] **Step 2: Write and run the one-off migration**

`migrate_mockup.py` (keep in the scratchpad; `site/` is the source of truth afterwards):
```python
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(sys.argv[1]).resolve()          # repo root
sys.path.insert(0, str(ROOT / "scripts"))
from optimize_images import MANIFEST        # noqa: E402

MOCK = ROOT / "docs" / "mockups"
SITE = ROOT / "site"
html = (MOCK / "e-final.html").read_text(encoding="utf-8")

# 1) CSS: shared.css (minus the font @import) + the page's inline <style>
inline = re.search(r"<style>\n(.*?)</style>", html, re.S).group(1)
shared = (MOCK / "shared.css").read_text(encoding="utf-8")
shared = re.sub(r"@import url\([^)]*\);\n", "", shared)
(SITE / "css").mkdir(parents=True, exist_ok=True)
# width/height attributes are added below; keep CSS-sized images in proportion
fix = "\n/* images carry width/height attributes */\nimg { height: auto; }\n.bar img { width: auto; }\n"
(SITE / "css" / "site.css").write_text(shared + "\n/* ---- page ---- */\n" + inline + fix, encoding="utf-8")
html = re.sub(r'<link rel="stylesheet" href="shared.css">\n<style>\n.*?</style>\n',
              '<link rel="stylesheet" href="css/site.css">\n', html, flags=re.S)

# 2) inline map script -> js/map.js
(SITE / "js").mkdir(exist_ok=True)
map_js = re.search(r"<script>\n(.*?)</script>\n", html, re.S).group(1)
(SITE / "js" / "map.js").write_text(map_js, encoding="utf-8")
html = re.sub(r"<script>\n.*?</script>\n", '<script src="js/map.js"></script>\n', html, count=1, flags=re.S)
for js in ("decanter.js", "lineart.js"):
    shutil.copy2(MOCK / js, SITE / "js" / js)
html = html.replace('src="lineart.js"', 'src="js/lineart.js"').replace('src="decanter.js"', 'src="js/decanter.js"')

# 3) image paths -> site/img, plus width/height, lazy loading below the hero
for src, (name, _edge) in MANIFEST.items():
    html = html.replace("../../" + src, "img/" + name)
for logo in ("nasha-logo.svg", "nasha-logo-blue.svg"):
    html = html.replace("../../assets/brand/" + logo, "img/" + logo)

def add_size(m):
    tag = m.group(0)
    src = re.search(r'src="([^"]+)"', tag).group(1)
    if " width=" in tag or src.startswith("http"):
        return tag
    with Image.open(SITE / src) if not src.endswith(".svg") else open(SITE / src) as f:
        if src.endswith(".svg"):
            vb = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', f.read())
            w, h = round(float(vb.group(1))), round(float(vb.group(2)))
        else:
            w, h = f.size
    lazy = "" if "logo" in src else ' loading="lazy" decoding="async"'
    return tag[:-1] + f' width="{w}" height="{h}"{lazy}>'

html = re.sub(r"<img [^>]+>", add_size, html)

# 4) head: title, description, Open Graph, favicon, fonts
head_extra = """<title>Nasha kaviareň · Vranov nad Topľou</title>
<meta name="description" content="Nasha kaviareň s vlastnou pražiarňou na Námestí slobody vo Vranove nad Topľou. Výberová káva, filter, koláče, nápojový lístok a otváracie hodiny.">
<meta property="og:type" content="website">
<meta property="og:title" content="Nasha kaviareň · Vranov nad Topľou">
<meta property="og:description" content="Kaviareň s vlastnou pražiarňou na Námestí slobody vo Vranove nad Topľou.">
<meta property="og:image" content="img/og.jpg">
<link rel="icon" href="img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Montserrat:wght@400;500;600&display=swap">
"""
html = re.sub(r"<title>.*?</title>\n", head_extra, html, count=1)
(SITE / "index.html").write_text(html, encoding="utf-8")
print("written", SITE / "index.html")
```
Run: `python <scratchpad>/migrate_mockup.py .`
Expected: `written …site\index.html`.

- [ ] **Step 3: Add 404 page and robots.txt**

`site/404.html`:
```html
<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stránka sa nenašla · Nasha kaviareň</title>
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/site.css">
</head>
<body>
<main class="wrap" style="min-height:80vh;display:grid;place-content:center;gap:24px;text-align:center">
  <img src="/img/nasha-logo-blue.svg" alt="nasha" width="203" height="64" style="margin:0 auto;height:56px;width:auto">
  <h1 class="caps" style="font-size:clamp(26px,4vw,40px)">Táto stránka neexistuje</h1>
  <p><a href="/">Späť na hlavnú stránku</a></p>
</main>
</body>
</html>
```
`site/robots.txt`:
```
User-agent: *
Allow: /
```

- [ ] **Step 4: Run the checker (must pass)**

Run: `python scripts/check_site.py site` and `python scripts/check_site.py site 404.html`
Expected: both exit 0; the first prints `images: … KB` under 1 536 KB. (`404.html` uses root-relative `/css/…`, `/img/…` so it works for any missing URL on Render.)

- [ ] **Step 5: Visual check against the mockup**

Run (repo root, server already running on 8765 or start `python -m http.server 8765`):
```bash
for w in 1440 1180; do "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 --window-size=$w,9500 --screenshot="<scratchpad>/site-$w.png" "http://localhost:8765/site/index.html?t=8000"; done
```
and the 390 px iframe wrapper used during mockups. Compare section by section with `docs/mockups/e-final.html` screenshots: same layout, all photos visible, animation frame shows the logo in the coffee.
Expected: no missing images, no layout differences except sharper/lighter images; header logo and hero logo not stretched.

- [ ] **Step 6: Map click and console**

With Playwright (or by hand in a browser): open `http://localhost:8765/site/index.html`, click "Zobraziť mapu", confirm an iframe with `google.com/maps` appears; console has no errors except the local favicon 404 from the python server root.

- [ ] **Step 7: Stage**

```bash
git add site
```

---

### Task 4: README, .gitignore, first commit and push

**Files:**
- Create: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: README**

`README.md`:
```markdown
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
```

- [ ] **Step 2: .gitignore**

Confirm `.gitignore` contains: `WORKLOG.md`, `.remember/`, `.env`, `.env.*`, `node_modules/`, `.DS_Store`, `.playwright-mcp/`, `assets/instagram/`, `docs/ig-scan.json`, `docs/ig-feed.json`. Add `__pycache__/` and `.pytest_cache/`.

- [ ] **Step 3: Review what will be committed**

Run: `git add README.md .gitignore .claude/settings.json requirements-dev.txt tests docs assets/brand assets/photos && git status --short`
Expected: only the files listed in the spec's Git section; nothing from `assets/instagram/`, no `WORKLOG.md`, no `.remember/`.

- [ ] **Step 4: Ask Dominik for the OK, then commit and push**

```bash
git commit -m "Add Nasha presentation site, image pipeline and checks"
git push -u origin main
```
Expected: push succeeds, GitHub repo shows `site/`.

---

### Task 5: Render Static Site

**Interfaces:**
- Consumes: pushed `main` branch.
- Produces: live URL `https://<name>.onrender.com`.

- [ ] **Step 1: Create the static site via Render MCP**

`create_static_site` in workspace `tea-d6jdnjruibrs73ajcs10` with: name `nasha-prezentacny-web`, repo `https://github.com/Donimikk/nasha-prezentacny-web`, branch `main`, build command `echo "No build needed"`, publish path `site`, auto-deploy on commit, PR previews off.
Expected: service id and `*.onrender.com` URL returned. If the Render GitHub app has no access to the new repo, Dominik grants it in GitHub → Settings → Applications → Render, then retry.

- [ ] **Step 2: Wait for the deploy and check it**

`list_deploys` / `get_deploy` until status `live`; on failure `list_logs` for the build.
Expected: status `live`.

- [ ] **Step 3: Live checks**

Run: `curl -sI https://<name>.onrender.com/ | head -1` → `HTTP/2 200`; `curl -sI https://<name>.onrender.com/neexistuje | head -1` → 404 (note whether Render serves our `404.html`; Render static sites may need a rewrite rule — record the result, do not add one unless the default page is shown); headless screenshots of the live URL at 1440 and 390 px.
Expected: page matches the local screenshots.

- [ ] **Step 4: Record**

Update `WORKLOG.md` and the hub file `projects/nasha-prezentacny-web.md` (Status: live URL, service id).

---

### Task 6 (optional): Cloudflare Web Analytics

Only if Dominik creates a free Cloudflare account and gives the beacon snippet (cookieless, no DNS/proxy change).

- [ ] **Step 1:** Paste the snippet Cloudflare generates just before `</body>` in `site/index.html` (exact snippet from the Cloudflare dashboard, token included — it is public, not a secret).
- [ ] **Step 2:** `python scripts/check_site.py site` → exit 0 (external script is ignored by the checker).
- [ ] **Step 3:** Commit `Add Cloudflare Web Analytics`, push, confirm visits appear in the Cloudflare dashboard after a visit.
