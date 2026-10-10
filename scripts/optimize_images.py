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
    IG + "10-CxpJYHOIHM3.jpg": ("filter-nalievanie.webp", 900),
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
