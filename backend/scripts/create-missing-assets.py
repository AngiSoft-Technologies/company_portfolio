#!/usr/bin/env python3
"""Generate missing static assets referenced by the frontend.

Creates branded placeholders under backend/uploads/public/images so that every
frontend `/images/...` reference resolves once paths are rewritten to
`/uploads/public/...`. Covers raster + SVG assets that were never moved into
storage. No external downloads (brand assets cannot be fetched), so these are
generated locally from brand colors.
"""
import math
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..", "uploads", "public", "images")
ROOT = os.path.abspath(ROOT)

# Brand palette (from AGENTS / memory: dark blue + cyan/green accents)
NAVY = (7, 20, 43)
NAVY2 = (10, 27, 56)
CYAN = (34, 211, 238)
GREEN = (16, 185, 129)
WHITE = (255, 255, 255)
LIGHT_BG = (243, 246, 251)


def gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", size)
    dr = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        dr.line([(0, y), (w, y)], fill=c)
    return img


def add_grid(img, step=64, color=None, alpha=22):
    w, h = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(overlay)
    c = color or (255, 255, 255)
    for x in range(0, w, step):
        dr.line([(x, 0), (x, h)], fill=c + (alpha,))
    for y in range(0, h, step):
        dr.line([(0, y), (w, y)], fill=c + (alpha,))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def accent_dots(img, n=14, color=(255, 255, 255), alpha=30, r=3):
    w, h = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(overlay)
    import random
    random.seed(7)
    for _ in range(n):
        x = random.randint(0, w)
        y = random.randint(0, h)
        dr.ellipse([x - r, y - r, x + r, y + r], fill=color + (alpha,))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def save(img, rel):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, quality=92)
    print("wrote", rel)


def world_dot_svg(rel, dot_color, bg="none"):
    """Emit a dotted world-map SVG (1200x575) masked by coarse continents."""
    W, H = 1200, 575
    # coarse continent mask: list of (cx, cy, rx, ry) ellipses in svg coords
    continents = [
        (320, 250, 95, 130),   # N America
        (380, 430, 60, 90),    # S America
        (610, 300, 70, 110),   # Europe
        (660, 380, 130, 150),  # Africa
        (880, 300, 170, 160),  # Asia
        (1000, 470, 60, 45),   # Australia
    ]
    step = 16
    dots = []
    for y in range(20, H - 20, step):
        for x in range(20, W - 20, step):
            for (cx, cy, rx, ry) in continents:
                if ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1:
                    dots.append((x, y))
                    break
    circles = "\n".join(
        f'    <circle cx="{x}" cy="{y}" r="2.4" />' for (x, y) in dots
    )
    svg = (
        f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" '
        f'fill="{bg}">\n'
        f'  <g fill="{dot_color}">\n{circles}\n  </g>\n</svg>\n'
    )
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(svg)
    print("wrote", rel, f"({len(dots)} dots)")


def main():
    # hero-bg.jpg
    hero = add_grid(gradient((1920, 1080), NAVY, NAVY2), step=80, alpha=18)
    hero = accent_dots(hero, n=40, color=CYAN, alpha=26, r=3)
    save(hero, "hero-bg.jpg")

    # about/final-cta/build-with-angisoft.webp (+mobile)
    cta = add_grid(gradient((1200, 675), NAVY, NAVY2), step=64, alpha=16)
    cta = accent_dots(cta, n=26, color=GREEN, alpha=24, r=3)
    save(cta, "about/final-cta/build-with-angisoft.webp")

    cta_m = add_grid(gradient((600, 800), NAVY, NAVY2), step=56, alpha=16)
    cta_m = accent_dots(cta_m, n=22, color=GREEN, alpha=24, r=3)
    save(cta_m, "about/final-cta/build-with-angisoft-mobile.webp")

    # Posters & Campaigns / AngiSoft Thank You.png
    ty = add_grid(gradient((1080, 1350), NAVY, NAVY2), step=72, alpha=14)
    ty = accent_dots(ty, n=34, color=CYAN, alpha=22, r=3)
    save(ty, "Posters & Campaigns/AngiSoft Thank You.png")

    # Wallpapers / AngiSoft Website Landing !sr Design.png
    wp = add_grid(gradient((1920, 1080), NAVY, NAVY2), step=64, alpha=18)
    wp = accent_dots(wp, n=60, color=GREEN, alpha=18, r=4)
    save(wp, "Wallpapers/AngiSoft Website Landing !sr Design.png")

    # world-map-dots SVG variants
    world_dot_svg(
        "about/geography/world-map-dots-light.svg",
        dot_color="#0B1B38",  # dark dots for LIGHT backgrounds
    )
    world_dot_svg(
        "about/geography/world-map-dots-dark.svg",
        dot_color="#9FB4D8",  # light dots for DARK backgrounds
    )


if __name__ == "__main__":
    main()
