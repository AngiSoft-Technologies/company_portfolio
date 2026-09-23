// Normalize a raw BlogPost payload from the API into a stable shape used across
// the blog UI. The backend model has some field-name variations in legacy rows,
// so we tolerate excerpt/summary/shortDescription, coverImage/featuredImage/
// thumbnail, category/categoryRef/categoryName, and a denormalized or nested
// author object.
//
// "Learning" material types (video, audio, document, code, command, link, job)
// carry extra fields: contentType, mediaUrl, transcript, visibilityType,
// visibleUntil, resourceLinks. We pass those through unchanged so the type-
// aware renderers decide how to display them.

const pick = (obj, ...keys) => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return undefined;
};

const normalizeCategory = (post) => {
  const raw =
    pick(post, 'category') ||
    pick(post, 'categoryRef') ||
    null;

  if (raw && typeof raw === 'object') {
    return {
      id: raw.id || null,
      name: raw.name || 'Uncategorized',
      slug: raw.slug || null,
    };
  }

  const name = pick(post, 'categoryName', 'category');
  return {
    id: post?.categoryId || null,
    name: typeof name === 'string' ? name : 'Uncategorized',
    slug: null,
  };
};

const normalizeAuthor = (post) => {
  const raw = pick(post, 'author') || pick(post, 'authorRef') || null;

  if (raw && typeof raw === 'object') {
    const firstName = raw.firstName || '';
    const lastName = raw.lastName || '';
    const name =
      pick(raw, 'name') ||
      [firstName, lastName].filter(Boolean).join(' ') ||
      'AngiSoft Team';
    const initials = (
      pick(raw, 'initials') ||
      [firstName, lastName]
        .map((p) => (p || '').charAt(0))
        .join('')
        .toUpperCase() ||
      'AT'
    );
    return {
      id: raw.id || null,
      name,
      role: raw.role || 'Team Member',
      avatarUrl: raw.avatarUrl || null,
      initials,
    };
  }

  const name = pick(post, 'authorName') || 'AngiSoft Team';
  const initials = name
    .split(' ')
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AT';
  return {
    id: post?.authorId || null,
    name,
    role: pick(post, 'authorRole') || 'Team Member',
    avatarUrl: null,
    initials,
  };
};

const normalizeTags = (post) => {
  const raw = pick(post, 'tags');
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string') {
    return raw
      .split(/[;,]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
};

export const normalizeBlogPost = (post) => {
  if (!post || typeof post !== 'object') return null;

  const coverImage = pick(post, 'coverImage', 'featuredImage', 'thumbnail') || null;
  const excerpt =
    pick(post, 'excerpt', 'summary', 'shortDescription') || null;

  const contentType = pick(post, 'contentType') || 'article';
  const subtitle = pick(post, 'subtitle') || null;
  const mediaUrl = pick(post, 'mediaUrl') || null;
  const transcript = pick(post, 'transcript') || null;
  const visibilityType = pick(post, 'visibilityType') || 'permanent';
  const visibleUntil = pick(post, 'visibleUntil') || null;
  const resourceLinks = pick(post, 'resourceLinks') || null;
  const associatedService = pick(post, 'associatedService') || null;
  const associatedProduct = pick(post, 'associatedProduct') || null;

  return {
    id: post.id || post._id || null,
    slug: post.slug || null,
    title: post.title || 'Untitled',
    subtitle,
    excerpt,
    content: post.content || '',
    contentType,
    coverImage,
    mediaUrl,
    transcript,
    visibilityType,
    visibleUntil,
    resourceLinks,
    associatedService,
    associatedProduct,
    author: normalizeAuthor(post),
    category: normalizeCategory(post),
    categoryName: normalizeCategory(post).name,
    tags: normalizeTags(post),
    featured: Boolean(post.featured),
    published: post.published !== false,
    publishedAt: post.publishedAt || null,
    createdAt: post.createdAt || null,
    updatedAt: post.updatedAt || null,
    readingTime:
      typeof post.readingTime === 'number' ? post.readingTime : null,
    views: typeof post.views === 'number' ? post.views : 0,
    likes: typeof post.likes === 'number' ? post.likes : 0,
  };
};

export const normalizeBlogList = (data) => {
  const list = Array.isArray(data) ? data : (data?.data || []);
  return list.map(normalizeBlogPost).filter(Boolean);
};
