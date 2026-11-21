// @ts-nocheck
// Content rendering utilities for blog articles.
//
// The backend stores `content` as a free-form string. It may be:
//   - raw HTML (CMS rich-text export)
//   - markdown (authored in a markdown editor)
//   - plain text
// We NEVER trust incoming markup, so HTML/Markdown is sanitized with DOMPurify
// before it reaches dangerouslySetInnerHTML.

import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: false,
});

const HTML_TAG_RE = /<([a-z][a-z0-9]*)\b[^>]*>/i;
const MD_RE = /(^|\n)\s{0,3}#{1,6}\s|```|^\s*[-*+]\s|^\s*\d+\.\s|^\s*>\s|\[[^\]]+\]\([^)]+\)|`[^`]+`/m;

export const detectContentType = (content) => {
  if (!content || typeof content !== 'string') return 'plain';
  const trimmed = content.trim();
  if (!trimmed) return 'plain';
  if (HTML_TAG_RE.test(trimmed) || /^<!DOCTYPE|<html|<body|<p|<div|<h[1-6]|<ul|<ol|<table|<img|<section/i.test(trimmed)) {
    return 'html';
  }
  if (MD_RE.test(content)) return 'markdown';
  return 'plain';
};

const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target', 'rel'],
};

// Only these protocols may survive on an <a href>. Relative URLs resolve to
// the current origin (https in production), so they are allowed implicitly.
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

const linkBase = () =>
  typeof window !== 'undefined' && window.location?.href
    ? window.location.href
    : 'https://invalid.example/';

// Keep the flag on the DOMPurify instance so HMR module reloads cannot stack
// duplicate hooks.
const LINK_HOOK_FLAG = Symbol.for('angisoft.blogContent.safeLinksHook');

// Runs *after* DOMPurify has stripped unsafe markup. It normalises every link:
// unsafe protocols lose their href, and every remaining link gets
// rel="noopener noreferrer" so target="_blank" cannot expose window.opener.
const enforceSafeLinks = (node) => {
  if (!node || node.nodeType !== 1 || node.nodeName?.toUpperCase() !== 'A') return;
  if (typeof node.getAttribute !== 'function' || typeof node.setAttribute !== 'function') return;

  const href = node.getAttribute('href');
  if (href !== null) {
    let safe = false;
    try {
      const parsed = new URL(href.trim(), linkBase());
      safe = SAFE_LINK_PROTOCOLS.has(parsed.protocol);
    } catch {
      safe = false;
    }
    if (!safe) node.removeAttribute('href');
  }

  const rel = (node.getAttribute('rel') || '')
    .split(/\s+/)
    .filter((token) => token && token !== 'noopener' && token !== 'noreferrer');
  rel.push('noopener', 'noreferrer');
  node.setAttribute('rel', rel.join(' '));
};

const ensureLinkHook = () => {
  if (!DOMPurify || typeof DOMPurify.addHook !== 'function' || DOMPurify[LINK_HOOK_FLAG]) return;
  DOMPurify.addHook('afterSanitizeAttributes', enforceSafeLinks);
  DOMPurify[LINK_HOOK_FLAG] = true;
};

export const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  // Fail closed: no DOM / no usable DOMPurify means we emit nothing rather
  // than trusting a hand-rolled regex stripper.
  if (!DOMPurify || typeof DOMPurify.sanitize !== 'function' || DOMPurify.isSupported === false) return '';
  try {
    ensureLinkHook();
    return DOMPurify.sanitize(html, SANITIZE_CONFIG);
  } catch {
    return '';
  }
};

// Returns a sanitized HTML string suitable for dangerouslySetInnerHTML.
export const renderContent = (content) => {
  const type = detectContentType(content);
  if (type === 'html') {
    return sanitizeHtml(content);
  }
  if (type === 'markdown') {
    const html = marked.parse(content || '');
    return sanitizeHtml(html);
  }
  // Plain text: escape minimally and keep paragraph breaks.
  const escaped = String(content || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const blocks = escaped.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return sanitizeHtml(blocks.map((b) => `<p>${b.replace(/\n/g, '<br/>')}</p>`).join(''));
};

// Slugify a heading into a stable id. Keeps unicode letters/numbers.
export const slugifyHeading = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);

// Build a table of contents from headings present in the content.
// Supports both HTML (<h2>/<h3>) and Markdown (# / ## / ###).
export const buildTableOfContents = (content) => {
  const type = detectContentType(content);
  const items = [];

  if (type === 'html') {
    const headingRe = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match;
    while ((match = headingRe.exec(content)) !== null) {
      const level = Number(match[1]);
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (text) items.push({ id: slugifyHeading(text), text, level });
    }
  } else if (type === 'markdown') {
    const lines = content.split('\n');
    for (const line of lines) {
      const m = /^(#{2,3})\s+(.*)$/.exec(line);
      if (m) {
        const level = m[1].length;
        const text = m[2].replace(/[#*`]/g, '').trim();
        if (text) items.push({ id: slugifyHeading(text), text, level });
      }
    }
  }

  const seen = new Set();
  const result = items.map((it) => {
    let id = it.id || 'section';
    let n = 1;
    while (seen.has(id)) {
      id = `${it.id}-${n}`;
      n += 1;
    }
    seen.add(id);
    return { ...it, id };
  });

  return result;
};

// ── Mixed-media article parsing ──────────────────────────────────────────
// A rich "Learning" article may weave text, images, headings AND media blocks
// (a video mid-article, an audio clip, an external link/callout) in one
// document. Authors signal inline media with a fenced block whose language tag
// is one of: video | audio | link. Example:
//
//   ## Setup
//   Some text and an image:
//   ![diagram](https://.../x.png)
//
//   ```video
//   https://youtube.com/watch?v=abcd
//   ```
//
//   More text...
//
// `parseArticleBlocks` splits the source into an ordered list so the detail
// page can render a true flowing document: text blocks stay as sanitized
// markdown→HTML (kept in one <section> per run so heading IDs line up with the
// TOC), while media blocks render as their type-specific embed.
//
// For non-article content (or content with no media fences) we return a single
// `text` block so callers can fall back to the standard renderer.
export const MEDIA_FENCES = ['video', 'audio', 'link'];

export const parseArticleBlocks = (content) => {
  if (!content || typeof content !== 'string') return [{ kind: 'text', raw: '' }];

  // Only markdown supports the fenced convention + a clean TOC.
  if (detectContentType(content) !== 'markdown') {
    return [{ kind: 'text', raw: content }];
  }

  const fenceRe = /```(video|audio|link)\s*\n([\s\S]*?)```/g;
  const blocks = [];
  let lastIndex = 0;
  let match;

  while ((match = fenceRe.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index).trim();
    if (before) blocks.push({ kind: 'text', raw: before });

    const mediaKind = match[1];
    const payload = match[2].trim();
    blocks.push({ kind: mediaKind, raw: payload });
    lastIndex = fenceRe.lastIndex;
  }

  const tail = content.slice(lastIndex).trim();
  if (tail) blocks.push({ kind: 'text', raw: tail });

  // No media fences → treat as one text block (standard renderer path).
  if (!blocks.some((b) => MEDIA_FENCES.includes(b.kind))) {
    return [{ kind: 'text', raw: content }];
  }
  return blocks;
};

// Render a single text block (markdown → sanitized HTML).
export const renderTextBlock = (raw) => renderContent(raw);

