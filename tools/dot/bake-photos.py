# 1.8.0 (作者 2026-11-27 「全体的にドットで表現するので細かい画像は荒くして保存して利用すればいい」): the dot versions' photos, baked once.
# Each picture of assets/photos/ shrunk to 120 px on its short side, ordered-dithered (4x4 Bayer) to 7 levels per channel - the same
# picture dot/js/dot/photos.js used to draw in the browser at every boot from the full-size file - saved as dot/assets/photos/<name>.png.
# The dot versions load only these small files (the full-size photos stay for the photo version). Re-run after adding or changing a photo:
#   python tools/dot/bake-photos.py            (only missing / older ones)      python tools/dot/bake-photos.py --all
import os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC, OUT = os.path.join(ROOT, 'assets', 'photos'), os.path.join(ROOT, 'dot', 'assets', 'photos')
SHORT, LEVELS = 120, 7
BAYER = [(v + 0.5) / 16 - 0.5 for v in [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]]


def bake(src, dst):
    im = Image.open(src).convert('RGB')
    k = min(1.0, SHORT / min(im.size))
    w, h = max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k))
    im = im.resize((w, h), Image.LANCZOS)
    px, step = im.load(), 255 / (LEVELS - 1)
    for y in range(h):
        for x in range(w):
            b = BAYER[(y & 3) * 4 + (x & 3)] * step
            px[x, y] = tuple(max(0, min(255, round(round((c + b) / step) * step))) for c in px[x, y])
    im.save(dst, optimize=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    every = '--all' in sys.argv
    names = sorted(f for f in os.listdir(SRC) if f.lower().endswith(('.webp', '.png', '.jpg', '.jpeg')))
    made = 0
    for f in names:
        src, dst = os.path.join(SRC, f), os.path.join(OUT, f + '.png')
        if every or not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
            bake(src, dst); made += 1
    gone = [f for f in os.listdir(OUT) if f.endswith('.png') and f[:-4] not in names]
    for f in gone: os.remove(os.path.join(OUT, f))
    size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'baked {made} of {len(names)} photos, removed {len(gone)}; dot/assets/photos {size // 1024} KB')


main()
