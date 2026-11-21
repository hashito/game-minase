"""Free-angle inspection view of a sprite stack (same idea as js/sprite-stack-voxel-view.js):
yaw around the vertical axis plus elevation (90 = straight down, 0 = eye level, < 0 = from below).
Orthographic rays through the slice volume, 1 voxel = 1 px, first solid voxel wins, faces shaded
x .9 / y .8 / top 1 / bottom .62. For review sheets and checks, not the in-game look.

    from voxel_view import render_voxel
    img = render_voxel(slices_rgba_image, slice_w, slice_d, count, yaw=45, elevation=85)  # PIL RGBA
"""
import math

import numpy as np
from PIL import Image


def volume(strip, w, d, count):
    a = np.asarray(strip.convert('RGBA'))            # (d, w*count, 4)
    return a.reshape(d, count, w, 4).transpose(2, 0, 1, 3)   # (x, y, z, rgba)


def render_voxel(strip, w, d, count, yaw=45, elevation=35, step=0.2):
    vol = volume(strip, w, d, count)
    h = count
    rad = math.ceil(math.hypot(w, d, h) / 2) + 1
    size = 2 * rad + 1
    a, e = math.radians(yaw % 360), math.radians(max(-89.9, min(90, elevation)))
    c, s, ce, se = math.cos(a), math.sin(a), math.cos(e), math.sin(e)
    R = np.array([c, -s, 0.0])
    F = np.array([-s, -c, 0.0])
    f = np.array([ce * F[0], ce * F[1], -se])
    U = np.array([se * F[0], se * F[1], ce])
    centre = np.array([w / 2, d / 2, h / 2])
    px, py = np.meshgrid(np.arange(size) - rad, rad - np.arange(size))
    origin = centre + px[..., None] * R + py[..., None] * U - f * rad * 1.2        # (size, size, 3)
    out = np.zeros((size, size, 4), np.uint8)
    done = np.zeros((size, size), bool)
    solid = vol[..., 3] > 127
    for t in np.arange(0, rad * 2.4, step):
        p = origin + f * t
        idx = np.floor(p).astype(int)
        inside = (idx[..., 0] >= 0) & (idx[..., 0] < w) & (idx[..., 1] >= 0) & (idx[..., 1] < d) & (idx[..., 2] >= 0) & (idx[..., 2] < h)
        cand = inside & ~done
        if not cand.any():
            continue
        ii = np.where(cand)
        vx, vy, vz = idx[ii][:, 0], idx[ii][:, 1], idx[ii][:, 2]
        hit = solid[vx, vy, vz]
        if not hit.any():
            continue
        rows, cols = ii[0][hit], ii[1][hit]
        q = p[rows, cols]
        fr = q - np.floor(q)
        # entry face: the axis whose fractional coordinate is closest to the side the ray came from
        dist = np.stack([np.where(f[k] > 0, fr[:, k], 1 - fr[:, k]) / max(abs(f[k]), 1e-6) for k in range(3)], 1)
        face = np.argmin(dist, 1)
        shade = np.where(face == 0, .9, np.where(face == 1, .8, np.where(f[2] < 0, 1.0, .62)))
        col = vol[vx[hit], vy[hit], vz[hit], :3].astype(float) * shade[:, None]
        out[rows, cols, :3] = np.clip(col, 0, 255).astype(np.uint8)
        out[rows, cols, 3] = 255
        done[rows, cols] = True
    return Image.fromarray(out, 'RGBA')
