import os
import urllib.request
import re
import sys

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
CSS_DIR = os.path.join(ASSETS_DIR, "css")
JS_DIR = os.path.join(ASSETS_DIR, "js")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")
IMG_DIR = os.path.join(ASSETS_DIR, "img")

# Create directories
for d in [CSS_DIR, JS_DIR, FONTS_DIR, IMG_DIR]:
    os.makedirs(d, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def download_file(url, dest_path):
    print(f"Downloading {url} -> {dest_path}")
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as response:
        with open(dest_path, 'wb') as f:
            f.write(response.read())

def download_bootstrap():
    # Bootstrap CSS
    bootstrap_css_url = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
    download_file(bootstrap_css_url, os.path.join(CSS_DIR, "bootstrap.min.css"))

    # Bootstrap JS
    bootstrap_js_url = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
    download_file(bootstrap_js_url, os.path.join(JS_DIR, "bootstrap.bundle.min.js"))

def download_bootstrap_icons():
    # Bootstrap Icons CSS
    bi_css_url = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
    bi_css_path = os.path.join(CSS_DIR, "bootstrap-icons.css")
    download_file(bi_css_url, bi_css_path)

    # Download font files referenced in CSS
    # Standard names: bootstrap-icons.woff2 and bootstrap-icons.woff
    bi_woff2_url = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/fonts/bootstrap-icons.woff2"
    bi_woff_url = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/fonts/bootstrap-icons.woff"

    download_file(bi_woff2_url, os.path.join(FONTS_DIR, "bootstrap-icons.woff2"))
    download_file(bi_woff_url, os.path.join(FONTS_DIR, "bootstrap-icons.woff"))

    # Rewrite CSS references from "./fonts/" to "../fonts/"
    with open(bi_css_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace relative path pointing to cdn or sub-fonts
    content = content.replace('./fonts/', '../fonts/')
    
    with open(bi_css_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Bootstrap Icons paths updated in CSS.")

def download_google_fonts():
    google_fonts_url = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
    print("Fetching Google Fonts CSS...")
    
    req = urllib.request.Request(google_fonts_url, headers=HEADERS)
    with urllib.request.urlopen(req) as response:
        css_content = response.read().decode('utf-8')

    # Find all font URLs in CSS: url(https://fonts.gstatic.com/s/...)
    urls = re.findall(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', css_content)
    print(f"Found {len(urls)} font files to download.")

    url_mapping = {}
    for url in urls:
        # Extract filename (e.g. QGYvz_MVcBeNP4NJtEtqUYLknw.woff2)
        filename = url.split('/')[-1]
        # Remove queries/hashes if any
        filename = filename.split('?')[0]
        
        dest_font_path = os.path.join(FONTS_DIR, filename)
        if not os.path.exists(dest_font_path):
            try:
                download_file(url, dest_font_path)
            except Exception as e:
                print(f"Failed to download font {url}: {e}")
                continue
        
        # Mapping for replacement: the URL might have quotes or not in original CSS
        url_mapping[url] = f"../fonts/{filename}"

    # Replace remote font URLs in CSS with local relative paths
    rewritten_css = css_content
    for remote_url, local_path in url_mapping.items():
        rewritten_css = rewritten_css.replace(remote_url, local_path)

    # Save to local CSS file
    fonts_css_path = os.path.join(CSS_DIR, "fonts.css")
    with open(fonts_css_path, "w", encoding="utf-8") as f:
        f.write(rewritten_css)
    print("Google Fonts local CSS saved to assets/css/fonts.css")

def download_room_images():
    images = {
        "reuniao": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
        "privativa": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
        "desk": "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80"
    }
    for name, url in images.items():
        dest = os.path.join(IMG_DIR, f"{name}.jpg")
        if not os.path.exists(dest):
            download_file(url, dest)
    print("Room images localized successfully.")

if __name__ == "__main__":
    try:
        print("Starting asset localization...")
        download_bootstrap()
        download_bootstrap_icons()
        download_google_fonts()
        download_room_images()
        print("All assets localized successfully!")
    except Exception as e:
        print(f"Error occurred: {e}", file=sys.stderr)
        sys.exit(1)
