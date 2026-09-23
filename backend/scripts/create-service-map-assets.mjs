#!/usr/bin/env node
/**
 * Generate branded placeholder illustrations for the About "Service Map" tiles.
 *
 * Each service references /uploads/public/images/about/service-map/<id>.webp
 * (about-default-data.ts -> serviceMap.services[].imageUrl). Those files did
 * not exist on disk, so the <img> tags 404'd. This writes a branded webp
 * placeholder (navy gradient + accent glow + title + glyph) per service so the
 * URLs resolve. Generated and rasterized via Python/PIL (webp-capable).
 *
 * Run:  node scripts/create-service-map-assets.mjs   (from backend/)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import util from 'node:util';

const ROOT = path.resolve(process.cwd(), 'uploads', 'public', 'images', 'about', 'service-map');
fs.mkdirSync(ROOT, { recursive: true });

const SERVICES = [
  ['web-development', 'Web Development', 'WEB'],
  ['mobile-development', 'Mobile Development', 'APP'],
  ['code-debugging', 'Code Debugging', 'BUG'],
  ['data-analysis', 'Data Analysis', 'DATA'],
  ['document-editing', 'Document Editing', 'DOC'],
  ['database-design', 'System & Database Design', 'DB'],
  ['custom-systems', 'Custom Systems', 'SYS'],
  ['software-installation', 'Software Installation', 'INST'],
  ['system-upgrades', 'System Upgrades', 'UP'],
  ['posters-graphics', 'Design Posters & Graphics', 'ART'],
  ['online-applications', 'Online Applications', 'ONL'],
  ['in-house-products', 'In-House Products', 'PROD'],
];

const NAVY_TOP = '#0B1B38';
const NAVY_BOT = '#07142B';
const ACCENT = '#08A0F5';
const ACCENT2 = '#00D08A';
const TEXT = '#F5F7FA';

// Build the PIL python script per-service and run it.
const py = (out, title, glyph) => `
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

W, H = 1200, 675
# vertical navy gradient
def lerp(a, b, t): return tuple(int(a[i] + (b[i]-a[i])*t) for i in range(3))
c0 = (0x0B,0x1B,0x38); c1 = (0x07,0x14,0x2B)
img = Image.new("RGB", (W, H))
px = img.load()
for y in range(H):
    t = y/(H-1)
    for x in range(W):
        px[x,y] = lerp(c0, c1, t)

def hexrgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def radial(cx, cy, r, color, alpha):
    lay = Image.new("RGBA", (W,H), (0,0,0,0))
    d = ImageDraw.Draw(lay)
    for i in range(r, 0, -1):
        a = int(alpha * (i/r))
        d.ellipse([cx-i, cy-i, cx+i, cy+i], fill=color+(a,))
    return lay.filter(ImageFilter.GaussianBlur(r*0.6))

g = Image.new("RGBA", (W,H))
g.alpha_composite(radial(int(W*0.8), int(H*0.15), 360, hexrgb("${ACCENT}"), 60))
g.alpha_composite(radial(int(W*0.1), int(H*0.9), 280, hexrgb("${ACCENT2}"), 45))
img = Image.alpha_composite(img.convert("RGBA"), g).convert("RGB")

d = ImageDraw.Draw(img)
font_bold = None
for cand in ["DejaVuSans-Bold.ttf","Arial.ttf","LiberationSans-Bold.ttf"]:
    try:
        font_bold = ImageFont.truetype(cand, 48); break
    except Exception:
        continue
if font_bold is None:
    font_bold = ImageFont.load_default()
font_glyph = ImageFont.truetype(font_bold.path, 120) if hasattr(font_bold,"path") else font_bold
font_small = ImageFont.truetype(font_bold.path, 26) if hasattr(font_bold,"path") else font_bold

cx = W//2
# glyph circle
d.ellipse([cx-130, 120, cx+130, 380], outline=hexrgb("${ACCENT}"), width=4)
d.text((cx, 250), "${glyph}", font=font_glyph, fill=hexrgb("${TEXT}"), anchor="mm")
# title (wrap to 2 lines if long)
title = "${title}".replace("&","and")
words = title.split()
lines = []
cur = ""
for w in words:
    if d.textlength((cur+" "+w).strip(), font=font_bold) > W-200 and cur:
        lines.append(cur); cur = w
    else:
        cur = (cur+" "+w).strip()
if cur: lines.append(cur)
ty = 430
for ln in lines:
    d.text((cx, ty), ln, font=font_bold, fill=hexrgb("${TEXT}"), anchor="mm")
    ty += 56
d.text((cx, 620), "ANGISOFT", font=font_small, fill=hexrgb("${ACCENT}"), anchor="mm")
img.save("${out}", "WEBP", quality=88)
print("OK ${out}")
`;

let failed = 0;
for (const [id, title, glyph] of SERVICES) {
  const out = path.join(ROOT, `${id}.webp`);
  const tmpPy = path.join(os.tmpdir(), `sm_${id}.py`);
  fs.writeFileSync(tmpPy, py(out, title, glyph));
  try {
    const r = execFileSync('python3', [tmpPy], { encoding: 'utf8' });
    process.stdout.write(r);
  } catch (e) {
    console.error('FAIL', id, e.stderr || e.message);
    failed++;
  }
}
console.log('Wrote', SERVICES.length - failed, '/', SERVICES.length, 'illustrations to', ROOT);
process.exitCode = failed ? 1 : 0;
