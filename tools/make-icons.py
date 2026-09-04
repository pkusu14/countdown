"""Resizes the source icon into the sizes the two phones ask for.

    python tools/make-icons.py

Only needs re-running if the icon artwork changes.
"""

import pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "icon-source.png"
OUT = ROOT / "assets" / "icons"

# 180 is what iOS wants for the home screen, 192 and 512 are the manifest sizes
SIZES = [180, 192, 512]

OUT.mkdir(parents=True, exist_ok=True)

img = Image.open(SRC).convert("RGB")

for size in SIZES:
    img.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}.png", optimize=True)
    print(f"  wrote icon-{size}.png")

# favicon for the desktop browser tab
img.resize((32, 32), Image.LANCZOS).save(ROOT / "favicon.ico", sizes=[(32, 32)])
print("  wrote favicon.ico")
