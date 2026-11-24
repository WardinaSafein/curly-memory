#!/usr/bin/env python3
"""Fit a delivered image to an exact game size by scaling to cover and cropping.

    python3 tools/art/fit_image.py IN.png OUT.png 1920 1080 [--anchor-y 0.5]

--anchor-y: 0 = keep the top, 1 = keep the bottom, 0.5 = crop evenly (default).
"""
import os
import argparse
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('w', type=int); ap.add_argument('h', type=int)
ap.add_argument('--anchor-y', type=float, default=0.5); ap.add_argument('--anchor-x', type=float, default=0.5)
a = ap.parse_args()
im = Image.open(a.src)
mode = 'RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB'
im = im.convert(mode)
s = max(a.w / im.width, a.h / im.height)
im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
x = round((im.width - a.w) * a.anchor_x); y = round((im.height - a.h) * a.anchor_y)
os.makedirs(os.path.dirname(os.path.abspath(a.dst)), exist_ok=True)
im.crop((x, y, x + a.w, y + a.h)).save(a.dst, optimize=True)
print(f'{a.dst}: {a.w}x{a.h} (scale {s:.3f}, crop x={x} y={y})')
