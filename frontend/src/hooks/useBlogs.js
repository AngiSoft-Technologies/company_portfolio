import { useCallback, useEffect, useMemo, useState } from 'react';
import { safeGet } from '../js/httpClient';
import { normalizeBlogList } from '../utils/blog/normalizeBlogPost';
import { calculateReadingTime } from '../utils/blog/blogFormatters';
import { isVisible } from '../utils/blog/blogTypes';

const sortByFeaturedThenDate = (a, b) => {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  const da = a.publishedAt || a.createdAt || 0;
  const db = b.publishedAt || b.createdAt || 0;
  return new Date(db) - new Date(da);
};

const deriveExcerpt = (post) => {
  if (post.excerpt) return post.excerpt;
  return null; // BlogArticleContent / BlogCard compute on demand
};

export const useBlogs = () => {
  const [rawPosts, setRawPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchPosts = async () => {
      setLoading(true);
      setError('');
      const res = await safeGet('/blogs');
      if (!active) return;
      if (!res.ok) {
        setError(res.error || 'Failed to load articles');
        setRawPosts([]);
      } else {
        const normalized = normalizeBlogList(res.data).map((post) => {
          const readingTime = post.readingTime || calculateReadingTime(post.content);
          return { ...post, readingTime, excerpt: deriveExcerpt(post) || post.excerpt };
        });
        normalized.sort(sortByFeaturedThenDate);
        setRawPosts(normalized);
      }
      setLoading(false);
    };
    fetchPosts();
    return () => {
      active = false;
    };
  }, [refetchToken]);

  const { posts, featuredPosts, categories, tags } = useMemo(() => {
    // Hide posts whose visibility window (timed posts) has closed.
    const published = rawPosts.filter(
      (p) => p.published !== false && isVisible(p)
    );
    const featured = published.filter((p) => p.featured);
    const catsMap = new Map();
    const tagSet = new Set();
    published.forEach((p) => {
      if (p.category && p.category.name) {
        const key = p.category.slug || p.category.name;
        if (!catsMap.has(key)) catsMap.set(key, p.category);
      }
      (p.tags || []).forEach((t) => tagSet.add(t));
    });
    const cats = [
      { id: null, name: 'All', slug: null },
      ...Array.from(catsMap.values()),
    ];
    return {
      posts: published,
      featuredPosts: featured,
      categories: cats,
      tags: Array.from(tagSet).sort(),
    };
  }, [rawPosts]);

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), []);

  return { posts, featuredPosts, categories, tags, loading, error, refetch };
};
