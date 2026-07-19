import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 9;

const matchesSearch = (post, term) => {
  if (!term) return true;
  const q = term.toLowerCase();
  const haystack = [
    post.title,
    post.excerpt || '',
    post.content || '',
    post.categoryName || '',
    (post.tags || []).join(' '),
    post.author?.name || '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
};

export const useBlogFilters = (posts, options = {}) => {
  const pageSize = options.pageSize || PAGE_SIZE;
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Keep URL in sync without creating history spam (replace, not push).
  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedCategory) next.set('category', selectedCategory);
    if (selectedTag) next.set('tag', selectedTag);
    if (search) next.set('q', search);
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategory, selectedTag, page]);

  const filtered = useMemo(() => {
    return (posts || []).filter((post) => {
      const catOk = !selectedCategory || post.category?.slug === selectedCategory;
      const tagOk = !selectedTag || (post.tags || []).includes(selectedTag);
      return catOk && tagOk && matchesSearch(post, search);
    });
  }, [posts, selectedCategory, selectedTag, search]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));

  // Clamp page if filters reduce the result set.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setSelectedCategory('');
    setSelectedTag('');
    setPage(1);
  }, []);

  const setCategory = useCallback((slug) => {
    setSelectedCategory(slug || '');
    setPage(1);
  }, []);

  const setTag = useCallback((tag) => {
    setSelectedTag(tag || '');
    setPage(1);
  }, []);

  const setSearchTerm = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);

  const hasActiveFilters = Boolean(search || selectedCategory || selectedTag);

  return {
    search,
    selectedCategory,
    selectedTag,
    page,
    filtered,
    paginated,
    totalResults,
    totalPages,
    pageSize,
    hasActiveFilters,
    setSearch: setSearchTerm,
    setCategory,
    setTag,
    setPage,
    clearFilters,
  };
};
