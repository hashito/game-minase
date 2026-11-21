#!/usr/bin/env python3
"""Review sheet of some dot stacks at a few angles, large: python tools/dot/view.py out.png id [id ...] [--angles 0:8,90:8,180:8,35:35]"""
import json, os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voxel_view import render_voxel
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(ROOT, 'dot', 'assets', 'stacks')
args = sys.argv[1:]
angles = [(0, 8), (60, 8), (180, 8), (300, 30)]
if '--angles' in args:
    i = args.index('--angles'); angles = [tuple(map(float, a.split(':'))) for a in args[i + 1].split(',')]; del args[i:i + 2]
out, ids = args[0], args[1:]
idx = json.load(open(os.path.join(D, 'index.json'), encoding='utf-8'))
tiles = [[render_voxel(Image.open(os.path.join(D, f'{k}.png')), idx[k]['w'], idx[k]['d'], idx[k]['n'], yaw=y, elevation=e) for y, e in angles] for k in ids]
cw = max(t.width for r in tiles for t in r); ch = max(t.height for r in tiles for t in r)
img = Image.new('RGBA', (cw * len(angles), ch * len(tiles)), (88, 84, 80, 255))
for i, r in enumerate(tiles):
    for j, t in enumerate(r): img.paste(t, (j * cw + (cw - t.width) // 2, i * ch + (ch - t.height)), t)
k = max(1, min(8, 1400 // img.width, 1400 // img.height))
img.resize((img.width * k, img.height * k), Image.NEAREST).save(out)
