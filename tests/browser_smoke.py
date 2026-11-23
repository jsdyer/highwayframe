"""Exercise Highway Frame at a project subpath in Chromium."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    screenshots = ROOT / "browser-checks"
    screenshots.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        shutil.copytree(ROOT / "dist", Path(temporary) / "highwayframe")
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=temporary))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch()
                page = browser.new_page(viewport={"width": 1280, "height": 1000})
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(f"http://127.0.0.1:{server.server_port}/highwayframe/")
                page.wait_for_function("() => document.querySelector('#finding').textContent.includes('camera sites')")
                assert "langley" in page.locator("#finding").inner_text().lower()
                page.locator("#query").fill("Revelstoke")
                page.wait_for_function("() => document.querySelector('#frames').textContent.includes('Revelstoke')")
                page.locator("#query").fill("10")
                page.wait_for_function("() => !document.querySelector('#frames').textContent.includes('Highway 1 ·')")
                assert "Highway 10" in page.locator("#frames").inner_text()
                page.locator("#query").fill('<img src=x onerror="alert(1)">')
                html = page.locator("#finding").inner_html()
                assert "<img" not in html
                assert page.locator('img[src="x"]').count() == 0
                page.locator("#query").fill("Langley")
                page.wait_for_function(
                    "() => { const frames = document.querySelector('#frames'); return frames && (frames.querySelector('img') || frames.querySelector('.miss')); }"
                )
                page.screenshot(path=str(screenshots / "desktop.png"), full_page=True)
                page.set_viewport_size({"width": 390, "height": 844})
                assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
                page.screenshot(path=str(screenshots / "mobile.png"), full_page=True)
                assert not errors, errors
                browser.close()
            print("Browser checks passed: project subpath, highway 10, safe text and mobile layout")
        finally:
            server.shutdown()


if __name__ == "__main__":
    main()
