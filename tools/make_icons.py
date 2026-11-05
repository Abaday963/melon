"""Рисует иконки Melon из формы ломтика в векторе. Запуск: python tools/make_icons.py"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
BG = (17, 20, 13, 255)
RIND = (200, 224, 107, 255)
FLESH = (244, 228, 138, 255)
SEED = (17, 20, 13, 255)

# Та же геометрия, что и в логотипе в js/app.js (поле 48×48).
OUTER = ((33.2, 5.8), (5.8, 33.2), 19.6, True)
FLESH_ARC = ((29.0, 13.4), (14.6, 28.0), 10.8, False)
SEEDS = [(28.6, 18.2), (27.0, 21.6), (24.0, 25.4), (20.0, 27.8)]


def arc_points(start, end, radius, large):
    """Точки дуги окружности от start к end по часовой стрелке на экране."""
    (x0, y0), (x1, y1) = start, end
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    half = math.dist(start, end) / 2
    offset = math.sqrt(max(radius**2 - half**2, 0))
    nx, ny = -(y1 - y0) / (2 * half), (x1 - x0) / (2 * half)
    sign = -1 if large else 1
    cx, cy = mx + sign * offset * nx, my + sign * offset * ny
    a0 = math.atan2(y0 - cy, x0 - cx)
    a1 = math.atan2(y1 - cy, x1 - cx)
    if a1 < a0:
        a1 += 2 * math.pi
    return [
        (cx + radius * math.cos(a0 + (a1 - a0) * i / 200), cy + radius * math.sin(a0 + (a1 - a0) * i / 200))
        for i in range(201)
    ]


def render(size, pad, rounded=False):
    scale = 4
    big = size * scale
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if rounded:
        draw.rounded_rectangle((0, 0, big - 1, big - 1), radius=big // 5, fill=BG)
    else:
        draw.rectangle((0, 0, big, big), fill=BG)
    k = big * (1 - 2 * pad) / 48
    shift = big * pad

    def pts(points):
        return [(shift + x * k, shift + y * k) for x, y in points]

    outer = pts(arc_points(*OUTER))
    flesh = pts(arc_points(*FLESH_ARC))
    corner = 0.8 * k
    for shape, color in ((outer, RIND), (flesh, FLESH)):
        draw.polygon(shape, fill=color)
        draw.line(shape + shape[:1], fill=color, width=int(corner * 2), joint="curve")
        for x, y in (shape[0], shape[-1]):
            draw.ellipse((x - corner, y - corner, x + corner, y + corner), fill=color)
    seed = 1.15 * k
    for x, y in pts(SEEDS):
        draw.ellipse((x - seed, y - seed, x + seed, y + seed), fill=SEED)
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
render(180, 0.12).save(OUT / "apple-touch-icon.png")
render(192, 0.12, rounded=True).save(OUT / "icon-192.png")
render(512, 0.12, rounded=True).save(OUT / "icon-512.png")
render(512, 0.22).save(OUT / "icon-maskable-512.png")
render(48, 0.08, rounded=True).save(OUT / "favicon.png")
print("Готово:", sorted(p.name for p in OUT.iterdir()))
