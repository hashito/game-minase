# assets/og-image.png (1200x630): the title picture with the real title drawn over it (no letters come from the image model),
# and assets/favicon.svg (a white charm with a red seal). python tools/make-og.py
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
text((70, 420), '札の家', big, (240, 232, 214))
text((330, 452), '― 奥の棚の櫛', sub, (232, 220, 196))
text((72, 530), 'お札をはがして、奥の棚の櫛を持って来い。一人称3Dホラー', small, (214, 200, 176))
im.save('assets/og-image.png', optimize=True)
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#120e0a"/><rect x="20" y="6" width="24" height="52" fill="#ece4cf"/><circle cx="32" cy="16" r="6.5" fill="#9e1b17"/><rect x="29" y="27" width="6" height="22" fill="#1a120c"/></svg>\n'
open('assets/favicon.svg', 'w', newline='\n', encoding='utf-8').write(svg)
print('ok')
