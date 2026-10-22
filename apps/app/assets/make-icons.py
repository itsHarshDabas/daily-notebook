# Regenerates the app icons: python3 apps/app/assets/make-icons.py apps/app/assets/images
import sys
from PIL import Image, ImageDraw
OUT = sys.argv[1]
SS = 4  # supersample

INDIGO_TOP = (99, 91, 255)
INDIGO_BOT = (55, 48, 163)
PAPER = (255, 253, 247)
RING = (199, 196, 255)
HOLE = (55, 48, 163)
GREEN = (34, 181, 115)
EMPTY = (234, 231, 222)
PATTERN = [
    [1, 3, 0, 2],
    [2, 4, 3, 1],
    [0, 3, 4, 4],
    [3, 2, 4, 2],
]
ALPHA = [0, 0.28, 0.5, 0.75, 1.0]

def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))

def gradient(size):
    img = Image.new('RGBA', (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        d.line([(0, y), (size, y)], fill=mix(INDIGO_TOP, INDIGO_BOT, y / size) + (255,))
    return img

def mark(size, w, mono=False):
    """Notebook page with spiral rings and a contribution grid, centered, `w` = page width (px, final scale)."""
    S = size * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    W = w * SS
    H = W * 1.12
    x0 = (S - W) / 2 + W * 0.05
    y0 = (S - H) / 2
    r = W * 0.11
    paper = (255, 255, 255, 255) if mono else PAPER + (255,)
    # shadow
    if not mono:
        d.rounded_rectangle([x0 + W * 0.03, y0 + W * 0.04, x0 + W + W * 0.03, y0 + H + W * 0.04], r, fill=(20, 16, 80, 70))
    d.rounded_rectangle([x0, y0, x0 + W, y0 + H], r, fill=paper)
    # grid
    pad = W * 0.2
    gx0, gx1 = x0 + pad, x0 + W - W * 0.12
    gy0 = y0 + H * 0.2
    n = 4
    gap = (gx1 - gx0) * 0.09
    cell = ((gx1 - gx0) - gap * (n - 1)) / n
    cr = cell * 0.22
    for ri, row in enumerate(PATTERN):
        for ci, lvl in enumerate(row):
            cx = gx0 + ci * (cell + gap)
            cy = gy0 + ri * (cell + gap)
            if mono:
                fill = (0, 0, 0, 0) if lvl >= 2 else (255, 255, 255, 255)
                if lvl >= 2:
                    d.rounded_rectangle([cx, cy, cx + cell, cy + cell], cr, fill=fill)
                continue
            fill = EMPTY if lvl == 0 else mix(PAPER, GREEN, ALPHA[lvl])
            d.rounded_rectangle([cx, cy, cx + cell, cy + cell], cr, fill=fill + (255,))
    # spiral rings on the left edge
    rings = 5
    for i in range(rings):
        cy = y0 + H * (0.16 + i * 0.68 / (rings - 1))
        hx = x0 + W * 0.085
        hr = W * 0.032
        lw = W * 0.045
        ring = (255, 255, 255, 255) if mono else RING + (255,)
        # loop: a rounded bar from outside the page into the hole
        d.rounded_rectangle([x0 - W * 0.09, cy - lw / 2, hx, cy + lw / 2], lw / 2, fill=ring)
        if not mono:
            d.ellipse([hx - hr, cy - hr, hx + hr, cy + hr], fill=HOLE + (255,))
    return img.resize((size, size), Image.LANCZOS)

def save(img, name):
    img.save(f'{OUT}/{name}')

# Full icon (iOS / store / favicon)
icon = gradient(1024)
icon.alpha_composite(mark(1024, 560))
save(icon.convert('RGB'), 'icon.png')
save(icon.resize((48, 48), Image.LANCZOS).convert('RGB'), 'favicon.png')
# Android adaptive: 512 canvas, keep the mark inside the 66% safe zone
save(gradient(512), 'android-icon-background.png')
save(mark(512, 250), 'android-icon-foreground.png')
save(mark(432, 194, mono=True), 'android-icon-monochrome.png')
# Splash: mark on transparent, the splash background is indigo
save(mark(512, 360), 'splash-icon.png')
