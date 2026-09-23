// Single source of truth for the blog "Learning" material types.
//
// A publication is NOT just an article — it can be a video, podcast/audio,
// uploaded document, code snippet, command line, an external link, or a job
// posting with an application window. The type drives:
//   - the badge shown on cards
//   - the media renderer used on the detail page
//   - the visibility behaviour (timed vs permanent)
//
// Icons use Font Awesome 6 classes (loaded via CDN in index.html), so we keep
// them as class strings rather than react-icons to guarantee coverage.

export const CONTENT_TYPES = {
  article: {
    id: 'article',
    label: 'Article',
    icon: 'fa-solid fa-newspaper',
    badge: 'blog-type--article',
    hasMedia: false,
    defaultCta: 'Read Article',
  },
  video: {
    id: 'video',
    label: 'Video',
    icon: 'fa-solid fa-circle-play',
    badge: 'blog-type--video',
    hasMedia: true,
    defaultCta: 'Watch',
  },
  audio: {
    id: 'audio',
    label: 'Audio',
    icon: 'fa-solid fa-podcast',
    badge: 'blog-type--audio',
    hasMedia: true,
    supportsTranscript: true,
    defaultCta: 'Listen',
  },
  document: {
    id: 'document',
    label: 'Document',
    icon: 'fa-solid fa-file-lines',
    badge: 'blog-type--document',
    hasMedia: true,
    defaultCta: 'Open Document',
  },
  code: {
    id: 'code',
    label: 'Code',
    icon: 'fa-solid fa-code',
    badge: 'blog-type--code',
    hasMedia: false,
    defaultCta: 'View Code',
  },
  command: {
    id: 'command',
    label: 'Commands',
    icon: 'fa-solid fa-terminal',
    badge: 'blog-type--command',
    hasMedia: false,
    defaultCta: 'View Commands',
  },
  link: {
    id: 'link',
    label: 'Resource',
    icon: 'fa-solid fa-link',
    badge: 'blog-type--link',
    hasMedia: false,
    defaultCta: 'Open Resource',
  },
  job: {
    id: 'job',
    label: 'Job Opening',
    icon: 'fa-solid fa-briefcase',
    badge: 'blog-type--job',
    hasMedia: false,
    defaultCta: 'Apply Now',
  },
};

export const getContentType = (type) =>
  CONTENT_TYPES[type] || CONTENT_TYPES.article;

export const isMediaType = (type) => Boolean(getContentType(type).hasMedia);

export const supportsTranscript = (type) =>
  Boolean(getContentType(type).supportsTranscript);

// Visibility contract: posts may live forever ("permanent") or until a
// timestamp set by the authoring staff (admin can override).
export const VISIBILITY = {
  permanent: 'permanent',
  timed: 'timed',
};

export const isExpired = (visibleUntil) => {
  if (!visibleUntil) return false;
  const until = new Date(visibleUntil).getTime();
  if (Number.isNaN(until)) return false;
  return Date.now() > until;
};

export const isVisible = (post) => {
  if (post?.visibilityType === VISIBILITY.timed) {
    return !isExpired(post.visibleUntil);
  }
  return true;
};

export const formatVisibilityUntil = (visibleUntil) => {
  if (!visibleUntil) return '';
  const d = new Date(visibleUntil);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Days remaining until the visibility window closes (0 if past/none).
export const daysRemaining = (visibleUntil) => {
  if (!visibleUntil) return null;
  const until = new Date(visibleUntil).getTime();
  if (Number.isNaN(until)) return null;
  return Math.max(0, Math.ceil((until - Date.now()) / (1000 * 60 * 60 * 24)));
};

// Normalize resourceLinks: backend sends JSONB, may be an array or string.
export const getResourceLinks = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};
