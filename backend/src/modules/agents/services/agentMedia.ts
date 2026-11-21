import { uploadObject, toPublicUrl, isS3Enabled } from '../../files/services/storage/s3';

/**
 * Branded cover-image generation for agent-produced content.
 *
 * Produces a clean SVG "card" (AngiSoft brand palette, title text) and stores
 * it in the public bucket so blog posts always ship with a real coverImage —
 * no stock-photo dependency, fully deterministic and free.
 */

const BRAND = {
    bg: '#0b1220',
    accent: '#4f7cff',
    accent2: '#22d3ee',
    text: '#f8fafc',
    muted: '#94a3b8',
};

function escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapTitle(title: string, maxChars = 34, maxLines = 3): string[] {
    const words = title.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
        if ((line + ' ' + w).trim().length > maxChars && line) {
            lines.push(line.trim());
            line = w;
            if (lines.length === maxLines - 1) break;
        } else {
            line = (line + ' ' + w).trim();
        }
    }
    const rest = words.slice(lines.join(' ').split(' ').length).join(' ');
    if (lines.length < maxLines) lines.push((line + (rest ? ' ' + rest : '')).trim());
    return lines.slice(0, maxLines);
}

/** Build the SVG cover markup for a title/subtitle. */
export function buildCoverSvg(title: string, subtitle?: string): string {
    const lines = wrapTitle(title);
    const lineHeight = 72;
    const startY = 300 - ((lines.length - 1) * lineHeight) / 2;
    const textEls = lines
        .map((l, i) => `<text x="80" y="${startY + i * lineHeight}" font-family="Inter, system-ui, sans-serif" font-size="56" font-weight="700" fill="${BRAND.text}">${escapeXml(l)}</text>`)
        .join('');
    const sub = subtitle
        ? `<text x="80" y="${startY + lines.length * lineHeight + 24}" font-family="Inter, system-ui, sans-serif" font-size="28" fill="${BRAND.muted}">${escapeXml(subtitle.slice(0, 90))}</text>`
        : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND.bg}"/>
      <stop offset="1" stop-color="#111c33"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1080" cy="80" r="220" fill="${BRAND.accent}" opacity="0.12"/>
  <circle cx="120" cy="560" r="160" fill="${BRAND.accent2}" opacity="0.10"/>
  <rect x="80" y="120" width="90" height="8" rx="4" fill="${BRAND.accent}"/>
  <rect x="80" y="140" width="50" height="8" rx="4" fill="${BRAND.accent2}"/>
  ${textEls}
  ${sub}
  <text x="80" y="580" font-family="Inter, system-ui, sans-serif" font-size="24" fill="${BRAND.muted}">AngiSoft Technologies</text>
</svg>`;
}

/**
 * Generate + store a cover image for `title`. Returns the public URL, or null
 * when object storage isn't configured (callers should fall back gracefully).
 */
export async function generateCoverImage(title: string, subtitle?: string, slug?: string): Promise<string | null> {
    if (!isS3Enabled()) return null;
    try {
        const key = `blog-covers/${slug ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}.svg`;
        await uploadObject({
            key,
            body: buildCoverSvg(title, subtitle),
            contentType: 'image/svg+xml',
            publicRead: true,
        });
        return toPublicUrl(key);
    } catch (err: any) {
        console.warn('[agents] cover image generation failed:', err?.message || err);
        return null;
    }
}
