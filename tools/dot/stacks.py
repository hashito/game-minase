#!/usr/bin/env python3
"""The sprite stacks of the dot version (ドット版・一人称) of 水無瀬病院, taken from the game-kit sprite-stack library
(kit main 1.20.1 f6b815b0, with the minase parts). Where the library has no fitting part, a part is designed in the kit
(branch sprites-m1: tools/sprite-stacks/design/fam_m1_minase.py), never a voxelized game mesh (game-kit docs/sprite-stacks.md).

    python tools/dot/stacks.py --kit <game-kit main checkout, 1.20.4+> [--sheet D:/minase-dot-stages/stacks.png]

The parts made for this game (helper M2, ids minase-m2-*, in the library since kit 1.20.4 9c9832c4) are listed in M2 below and
written as stacks named after the part without the minase-m2- prefix.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'dot', 'assets', 'stacks')

# library parts used as they are: id in the dot version -> library id
PLAIN = {
    # the plan's furniture kinds (data/plan.json furniture[].kind -> the stack that takes its place; dot/js/dot/index.js FURN)
    'bench': 'env-props-bench-waiting', 'locker': 'props-locker', 'vending': 'atmos-k4-vending-light-out', 'plant': 'atmos-k3-dead-plant',
    'extinguisher': 'game-fire-extinguisher', 'desk': 'hikage-office-desk', 'filing': 'props-filing-cabinet', 'karte-shelf': 'minase-karte-shelf',
    'exam-bed': 'game-bed', 'pipe-chair': 'props-pipe-chair', 'shelf': 'hikage-supply-shelf', 'drum': 'atmos-k3-drum-rust',
    'steel-desk': 'hikage-meas-desk', 'office-chair': 'hikage-office-chair', 'crate': 'env-props-crate-slat', 'body-cabinets': 'minase-body-cabinets',
    'gurney-shape': 'atmos-k2-gurney-shape',
    # the items lying in the world (data/items.json; dot/js/dot/index.js ITEM_STACK)
    'flashlight': 'game-flashlight', 'key': 'game-kouguchi-lockerKey', 'paper': 'miru-delivery-pickup-paper-sheet', 'letter': 'game-whitepigeon-nurseLetter',
    'jar': 'atmos-k5-jar-sealed', 'tag': 'miru-delivery-pickup-tag',
    # the mood props (dot/data/props.json)
    'iv-dried': 'atmos-k2-iv-dried', 'iv-fallen': 'atmos-k2-iv-fallen', 'gurney-slipped': 'atmos-k2-gurney-slipped',
    'wheelchair-blanket': 'atmos-k2-wheelchair-blanket', 'wheelchair-overturned': 'atmos-k2-wheelchair-overturned', 'wheelchair-tipped': 'atmos-k3-wheelchair-tipped',
    'trolley-rounds': 'atmos-k2-trolley-rounds', 'trolley-disinfect': 'atmos-k2-trolley-disinfect', 'exam-lamp': 'atmos-k2-exam-lamp',
    'ward-screen-stain': 'atmos-k2-ward-screen-stain', 'ward-screen-torn': 'atmos-k2-ward-screen-torn',
    'specimen-broken': 'atmos-k2-specimen-broken', 'specimen-eyes': 'atmos-k2-specimen-eyes', 'specimen-organ': 'atmos-k2-specimen-organ',
    'tube-light-fallen': 'atmos-k3-fallen-tube-light', 'leak-bucket': 'atmos-k3-leak-bucket', 'floor-charts': 'minase-floor-charts',
    'wet-slippers': 'minase-wet-slippers', 'coat-scrap': 'minase-coat-scrap', 'collapsed-shelf': 'atmos-k3-collapsed-shelf',
}

# the helper's parts placed room by room (dot/data/props.json); the library id is minase-m2-<id>
M2 = ['hina-backpack', 'hina-camera', 'bucket-leak', 'number-display', 'reception-sign', 'wet-sign', 'nurse-board', 'stepladder',
      'record-boxes', 'bedside', 'chain-padlock', 'lift-indicator', 'call-off', 'pipe-ceiling', 'floating-debris',
      'hina-tape-arrow', 'breaker', 'fuel-tank', 'fuel-can', 'tool-board', 'hina-lantern', 'card-cabinet', 'toe-tag-tray', 'morgue-sink',
      'hina-glowsticks', 'foot-guide', 'valve-sign', 'jar-rack-wall', 'jar-crate', 'organ-scale', 'instrument-stand', 'ceiling-sag',
      'call-lit', 'emlamp-off', 'emlamp-on']


def load(kit, lib_id):
    if not hasattr(load, 'cat'):
        with open(os.path.join(kit, 'assets', 'sprite-stacks', 'catalog.json'), encoding='utf-8') as f:
            load.cat = {a['id']: a for a in json.load(f)['assets']}
    e = load.cat[lib_id]
    w, d = e['sliceSize']
    n = e['sliceCount']
    strip = Image.open(os.path.join(kit, 'assets', 'sprite-stacks', e['files']['slices']['file'])).convert('RGBA')
    a = np.asarray(strip).reshape(d, n, w, 4).transpose(2, 0, 1, 3).copy()   # (x, y, z, rgba); y grows toward the front
    a[..., 3] = np.where(a[..., 3] > 127, 255, 0)
    return a, e


def save(vol, out_id, meta, index):
    # trim empty margins (x / y) and empty top slices, keep the bottom at z 0
    solid = vol[..., 3] > 0
    xs, ys, zs = np.where(solid)
    vol = vol[xs.min():xs.max() + 1, ys.min():ys.max() + 1, :zs.max() + 1]
    w, d, n = vol.shape[:3]
    strip = vol.transpose(1, 2, 0, 3).reshape(d, n * w, 4)
    Image.fromarray(strip.astype(np.uint8), 'RGBA').save(os.path.join(OUT, f'{out_id}.png'), optimize=True)
    index[out_id] = {'w': int(w), 'd': int(d), 'n': int(n), **meta}
    return vol


def sheet(index, path):
    sys.path.insert(0, HERE)
    from voxel_view import render_voxel
    tiles = []
    for k, m in index.items():
        strip = Image.open(os.path.join(OUT, f'{k}.png'))
        tiles.append([render_voxel(strip, m['w'], m['d'], m['n'], yaw=y, elevation=e) for y, e in [(0, 8), (90, 8), (180, 8), (35, 35)]])
    cw = max(t.width for r in tiles for t in r)
    ch = max(t.height for r in tiles for t in r)
    cols = 2
    rows = (len(tiles) + cols - 1) // cols
    out = Image.new('RGBA', (cw * 4 * cols, ch * rows), (70, 70, 74, 255))
    for i, r in enumerate(tiles):
        for j, t in enumerate(r):
            out.paste(t, ((i % cols) * cw * 4 + j * cw + (cw - t.width) // 2, (i // cols) * ch + (ch - t.height)), t)
    k = max(1, 1600 // out.width)
    out.resize((out.width * k, out.height * k), Image.NEAREST).save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kit', required=True, help='a checkout of game-kit with the sprite-stack library')
    ap.add_argument('--sheet', help='write a review sheet of every stack (front, side, back, from above)')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    index = {}
    for out_id, lib in PLAIN.items():
        vol, e = load(a.kit, lib)
        save(vol, out_id, {'src': lib, 'mpp': e.get('metersPerPixel')}, index)
    for slug in M2:
        vol, e = load(a.kit, 'minase-m2-' + slug)
        save(vol, slug, {'src': 'minase-m2-' + slug, 'mpp': e.get('metersPerPixel')}, index)
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'{len(index)} stacks -> {OUT}')
    if a.sheet:
        sheet(index, a.sheet)
        print('sheet', a.sheet)


if __name__ == '__main__':
    main()
