# assets/og-image.png (1200x630): the title picture with the real title drawn over it (no letters come from the image model),
# and assets/favicon.svg (a specimen jar of yellow formalin). python tools/make-og.py
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
src = 'tools/_raw/title.png'
im = Image.open(src).convert('RGB')
w, h = im.size; k = max(1200 / w, 630 / h)
im = im.resize((round(w * k), round(h * k)), Image.LANCZOS)
x0 = (im.width - 1200) // 2; y0 = (im.height - 630) // 2
im = im.crop((x0, y0, x0 + 1200, y0 + 630))
shade = Image.new('L', (1200, 630), 0); d = ImageDraw.Draw(shade)
for y in range(630): d.line([(0, y), (1200, y)], fill=int(max(0, (y - 300) / 330) * 200))
im = Image.composite(Image.new('RGB', (1200, 630), (8, 6, 4)), im, shade)
dr = ImageDraw.Draw(im)
F = 'C:/Windows/Fonts/yumindb.ttf'
big = ImageFont.truetype(F, 84); sub = ImageFont.truetype(F, 38); small = ImageFont.truetype(F, 26)
def text(xy, s, f, fill):
    for dx, dy in ((2, 2), (0, 0)):
        dr.text((xy[0] + dx, xy[1] + dy), s, font=f, fill=(0, 0, 0) if dx else fill)
text((70, 420), '水無瀬病院', big, (226, 236, 232))
text((520, 452), '― 七番の瓶', sub, (214, 228, 222))
text((72, 530), '廃病院の地下から、七番の瓶を持って来い。一人称3Dホラー', small, (196, 214, 206))
im.save('assets/og-image.png', optimize=True)
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#0b1413"/><rect x="22" y="6" width="20" height="7" rx="2" fill="#2a2f2e"/><rect x="16" y="13" width="32" height="45" rx="7" fill="#9fb4ad" opacity=".55"/><rect x="18" y="26" width="28" height="30" rx="5" fill="#d8c341"/><ellipse cx="32" cy="45" rx="7" ry="8" fill="#5a4a3e"/><rect x="23" y="17" width="18" height="7" fill="#ece8dc"/></svg>' + chr(10)
open('assets/favicon.svg', 'w', newline='\n', encoding='utf-8').write(svg)
print('ok')
