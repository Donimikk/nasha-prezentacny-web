"""Static checks for the published site folder.

Checks every local reference in the page (src, href, data-logo, CSS url()),
exact-case file existence (Render serves from Linux), paths that escape the
site root, <img> attributes, tag balance, file names and image weight.
Usage: python scripts/check_site.py [site_root] [page]
"""
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

IMAGE_EXT = {".webp", ".jpg", ".jpeg", ".png", ".svg", ".gif"}
TRACKED = {"main", "header", "footer", "section", "div", "ul", "ol", "dl", "nav", "a", "p"}
NAME_OK = re.compile(r"^[a-z0-9._-]+$")


class _Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.imgs, self.stack, self.balance = [], [], [], []
        self.og_images, self.h1_count = [], 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for key in ("src", "href", "data-logo"):
            if a.get(key):
                self.refs.append(a[key])
        if tag == "img":
            self.imgs.append(a)
        if tag == "h1":
            self.h1_count += 1
        if tag == "meta" and a.get("property") == "og:image":
            self.og_images.append(a.get("content", ""))
        if tag in TRACKED:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if tag not in TRACKED:
            return
        if self.stack and self.stack[-1][0] == tag:
            self.stack.pop()
        else:
            self.balance.append(f"unbalanced </{tag}> at line {self.getpos()[0]}")


def _is_local(ref):
    return not ref.startswith(("http://", "https://", "//", "#", "mailto:", "tel:", "data:", "javascript:"))


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
    if clean.startswith("/"):  # root-relative, as served by Render
        base_dir, clean = root, clean.lstrip("/")
    # normpath, not resolve(): on Windows resolve() rewrites the case to match
    # the file on disk, which would hide case mismatches that break on Linux
    base = Path(os.path.normpath(Path(root).absolute()))
    target = Path(os.path.normpath(Path(base_dir).absolute() / clean))
    try:
        rel = target.relative_to(base)
    except ValueError:
        problems.append(f"{ref}: points outside the site folder")
        return None
    if not _exists_exact(base, rel):
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
            css = target.read_text(encoding="utf-8")
            for url in re.findall(r"url\(['\"]?([^'\")]+)['\"]?\)", css):
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

    # link previews (Facebook, LinkedIn, Slack) need an absolute og:image URL
    for url in parser.og_images:
        if not url.startswith(("https://", "http://")):
            problems.append(f"og:image {url!r}: must be an absolute URL")
    if parser.h1_count != 1:
        problems.append(f"page has {parser.h1_count} <h1> elements, expected exactly 1")

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
