// @ts-nocheck
// Shared helpers for turning a media URL into an embeddable/usable source.
// Imported by BlogArticleContent (inline media in mixed articles) and
// BlogMediaEmbed (dedicated media posts).
//
// Security rule: we only ever *construct* embed URLs for exact, known hosts.
// Arbitrary http(s) URLs are accepted for audio/file links (via toSafeHttpUrl)
// but are never treated as iframe sources.

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const YOUTUBE_SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{6,}$/;
const VIMEO_ID_RE = /^\d{1,15}$/;

const normalizeHost = (hostname) =>
  String(hostname || '').toLowerCase().replace(/\.$/, '');

// Strict URL parse: rejects malformed input and anything that is not http(s).
export const parseHttpUrl = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return HTTP_PROTOCOLS.has(url.protocol) ? url : null;
  } catch {
    return null;
  }
};

// Normalised, absolute http(s) URL or null. Used for audio/file/link blocks.
export const toSafeHttpUrl = (value) => {
  const url = parseHttpUrl(value);
  return url ? url.href : null;
};

export const isExternalMedia = (value) => parseHttpUrl(value) !== null;

const validYoutubeId = (value) => (YOUTUBE_ID_RE.test(value || '') ? value : null);
const validVimeoId = (value) => (VIMEO_ID_RE.test(value || '') ? value : null);

const youtubeIdFromUrl = (url) => {
  const host = normalizeHost(url.hostname);
  const segments = url.pathname.split('/').filter(Boolean);

  if (YOUTUBE_SHORT_HOSTS.has(host)) return validYoutubeId(segments[0]);
  if (!YOUTUBE_HOSTS.has(host)) return null;

  if (segments[0] === 'watch') return validYoutubeId(url.searchParams.get('v'));
  if (['embed', 'shorts', 'live', 'v'].includes(segments[0])) {
    return validYoutubeId(segments[1]);
  }
  return null;
};

const vimeoIdFromUrl = (url) => {
  if (!VIMEO_HOSTS.has(normalizeHost(url.hostname))) return null;
  const segments = url.pathname.split('/').filter(Boolean);
  const candidate = segments[0] === 'video' ? segments[1] : segments[0];
  return validVimeoId(candidate);
};

// Turn a trusted YouTube/Vimeo watch-or-embed URL into a constructed embed src.
// Returns null for every other URL — arbitrary origins are never embedded.
export const toEmbedSrc = (value) => {
  const url = parseHttpUrl(value);
  if (!url) return null;

  const youtubeId = youtubeIdFromUrl(url);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}`;

  const vimeoId = vimeoIdFromUrl(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;

  return null;
};
