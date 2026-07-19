// Shared helpers for turning a media URL into an embeddable/usable source.
// Imported by BlogArticleContent (inline media in mixed articles) and
// BlogMediaEmbed (dedicated media posts).

// Turn a bare YouTube/Vimeo URL (or an already-embed URL) into an embed src.
export const toEmbedSrc = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (/youtube\.com|youtu\.be/.test(u.hostname)) {
      const id = u.hostname === 'youtu.be'
        ? u.pathname.slice(1)
        : u.searchParams.get('v') || u.pathname.split('/').pop();
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (/vimeo\.com/.test(u.hostname)) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    if (u.protocol === 'http:' || u.protocol === 'https:') return url;
  } catch {
    return null;
  }
  return null;
};

export const isExternalMedia = (url) => /^https?:\/\//i.test(url || '');
