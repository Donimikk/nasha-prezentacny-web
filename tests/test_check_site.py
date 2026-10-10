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
