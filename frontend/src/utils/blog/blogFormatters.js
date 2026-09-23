// Blog display formatters. All dates use en-KE locale per project spec.

const dateFormatter = new Intl.DateTimeFormat('en-KE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const formatBlogDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return dateFormatter.format(date);
};

export const formatAuthorName = (author) => {
  if (!author) return 'AngiSoft Team';
  if (typeof author === 'string') return author || 'AngiSoft Team';
  return author.name || 'AngiSoft Team';
};

// Word-count based reading time (~200 wpm). Falls back to a sane minimum.
export const calculateReadingTime = (content) => {
  if (!content || typeof content !== 'string') return 1;
  const words = content
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const minutes = Math.max(1, Math.round(words.length / 200));
  return minutes;
};

export const formatReadingTime = (minutes) => {
  const value = Number(minutes);
  if (!value || Number.isNaN(value)) return '';
  return `${value} min read`;
};

// Safely strip HTML + markdown into a plain-text excerpt that preserves words.
export const createBlogExcerpt = (content, length = 160) => {
  if (!content || typeof content !== 'string') return '';

  let text = content
    // Remove code fences first so their content isn't mistaken for prose.
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    // Strip block-level + inline HTML.
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    // Plain-text markdown artifacts.
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= length) return text;
  const slice = text.slice(0, length);
  const lastSpace = slice.lastIndexOf(' ');
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : length).trim()}…`;
};

export const formatTagLabel = (tag) => {
  if (!tag) return '';
  return String(tag)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

export { dateFormatter };
