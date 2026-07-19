import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { safeGet } from '../js/httpClient';
import { normalizeBlogPost } from '../utils/blog/normalizeBlogPost';
import { calculateReadingTime } from '../utils/blog/blogFormatters';

// Fetch a single post by slug/id and enrich it with related + prev/next
// computed against the full published list (so ordering is correct even for
// the current post's category). Related algorithm: same category → shared
// tags → newest.
const computeRelated = (post, allPosts, limit = 3) => {
  const others = allPosts.filter((p) => p.id !== post.id);
  const scored = others.map((p) => {
    let score = 0;
    const sameCat =
      post.category?.name &&
      p.category?.name &&
      p.category.name === post.category.name;
    if (sameCat) score += 3;
    const sharedTags = (post.tags || []).filter((t) => (p.tags || []).includes(t)).length;
    score += sharedTags;
    return { post: p, score };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const da = a.post.publishedAt || a.post.createdAt || 0;
    const db = b.post.publishedAt || b.post.createdAt || 0;
    return new Date(db) - new Date(da);
  });
  return scored.slice(0, limit).map((s) => s.post);
};

const computePrevNext = (post, allPosts) => {
  const chronological = [...allPosts]
    .filter((p) => p.id !== post.id && (p.publishedAt || p.createdAt))
    .sort((a, b) => {
      const da = new Date(a.publishedAt || a.publishedAt || a.createdAt);
      const db = new Date(b.publishedAt || b.publishedAt || b.createdAt);
      return da - db;
    });
  const currentIndex = chronological.findIndex((p) => p.id === post.id);
  if (currentIndex === -1) return { previousPost: null, nextPost: null };
  return {
    previousPost: chronological[currentIndex - 1] || null,
    nextPost: chronological[currentIndex + 1] || null,
  };
};

export const useBlogDetail = (slugOrId) => {
  const params = useParams();
  const identifier = slugOrId || params?.slug || params?.id;
  const [post, setPost] = useState(null);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [refetchToken, setRefetchToken] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      setNotFound(false);

      const [detailRes, listRes] = await Promise.all([
        safeGet(`/blogs/${identifier}`),
        safeGet('/blogs'),
      ]);
      if (!active) return;

      const list = Array.isArray(listRes.data)
        ? listRes.data
        : (listRes?.data?.data || []);
      const normalizedList = list
        .map((p) => normalizeBlogPost(p))
        .filter((p) => p && p.published !== false);
      setAllPosts(normalizedList);

      if (!detailRes.ok || !detailRes.data) {
        if (detailRes.status === 404) setNotFound(true);
        else setError(detailRes.error || 'Failed to load article');
        setPost(null);
        setLoading(false);
        return;
      }

      const normalized = normalizeBlogPost(detailRes.data);
      normalized.readingTime = normalized.readingTime || calculateReadingTime(normalized.content);
      setPost(normalized);
      setLoading(false);
    };
    fetchAll();
    return () => {
      active = false;
    };
  }, [identifier, refetchToken]);

  const { relatedPosts, previousPost, nextPost } = useMemo(() => {
    if (!post) return { relatedPosts: [], previousPost: null, nextPost: null };
    return {
      relatedPosts: computeRelated(post, allPosts),
      ...computePrevNext(post, allPosts),
    };
  }, [post, allPosts]);

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), []);

  return { post, relatedPosts, previousPost, nextPost, loading, error, notFound, refetch };
};
