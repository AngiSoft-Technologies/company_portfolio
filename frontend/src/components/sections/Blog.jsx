import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { resolveAssetUrl } from '../../utils/constants';
import { getBlogDetailPath } from '../../utils/detailPaths';
import { FaArrowRight } from 'react-icons/fa';
import { IoSparkles } from 'react-icons/io5';
import '../../css/Blog.css';

const Blog = () => {
    const { colors, mode } = useTheme();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const isDark = mode === 'dark';

    useEffect(() => {
        let active = true;

        apiGet('/blogs')
            .then((response) => {
                if (!active) return;
                const records = Array.isArray(response)
                    ? response
                    : response?.data || response?.blogs || response?.posts || [];

                const published = records
                    .filter(
                        (post) =>
                            post &&
                            post.published !== false &&
                            post.status !== 'DRAFT' &&
                            post.status !== 'ARCHIVED'
                    )
                    .sort((a, b) => {
                        const da = new Date(a?.publishedAt || a?.createdAt || 0).getTime();
                        const db = new Date(b?.publishedAt || b?.createdAt || 0).getTime();
                        return db - da;
                    });

                setPosts(published.slice(0, 4));
            })
            .catch((err) => console.error('Failed to load blogs:', err))
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const getAuthorName = (post) => {
        if (post?.author && typeof post.author === 'object') {
            return `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || 'AngiSoft Team';
        }
        return post?.author || 'AngiSoft Team';
    };

    const getAuthorInitial = (post) => getAuthorName(post).charAt(0).toUpperCase();

    const getDate = (post) => {
        const value = post?.publishedAt || post?.createdAt;
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getTags = (post) => {
        if (Array.isArray(post?.tags) && post.tags.length > 0) return post.tags.slice(0, 4);
        if (post?.category) return [post.category];
        return [];
    };

    const rawDate = (post) => {
        const value = post?.publishedAt || post?.createdAt;
        return value ? new Date(value).toISOString() : '';
    };

    const cards = useMemo(
        () =>
            posts.map((post) => {
                const postPath = getBlogDetailPath(post);
                const cardKey = post.id || post.slug || postPath;
                const tags = getTags(post);

                return (
                    <Link key={cardKey} to={postPath} className="angi-blog-card">
                        <div className="angi-blog-thumbnail">
                            {post.coverImage ? (
                                <img
                                    src={resolveAssetUrl(post.coverImage)}
                                    alt={post.coverImageAlt || post.title}
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <div className="angi-blog-thumbnail-fallback">A</div>
                            )}
                        </div>

                        <div className="angi-blog-content">
                            {getDate(post) && (
                                <time className="angi-blog-date" dateTime={rawDate(post)}>
                                    {getDate(post)}
                                </time>
                            )}

                            <h3 className="angi-blog-post-title">{post.title}</h3>

                            <div className="angi-blog-author">
                                <div className="angi-blog-author-avatar">
                                    {getAuthorInitial(post)}
                                </div>
                                <span className="angi-blog-author-name">
                                    {getAuthorName(post)}
                                </span>
                            </div>

                            {tags.length > 0 && (
                                <div className="angi-blog-tags">
                                    {tags.map((tag) => (
                                        <span
                                            key={`${post.id || post.slug}-${tag}`}
                                            className="angi-blog-tag"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Link>
                );
            }),
        [posts]
    );

    if (loading || posts.length === 0) return null;

    return (
        <section
            id="blog"
            className={`angi-blog-section ${isDark ? 'is-dark' : 'is-light'}`}
            style={{
                '--blog-primary': colors?.primary || '#0875FF',
                '--blog-secondary': colors?.secondary || '#00AFFF',
            }}
        >
            <IoSparkles className="angi-blog-sparkle" aria-hidden="true" />

            <div className="angi-blog-container">
                <header className="angi-blog-header">
                    <div className="angi-blog-badge">
                        <IoSparkles aria-hidden="true" />
                        <span>Featured Posts</span>
                    </div>

                    <h2 className="angi-blog-title">
                        Featured{' '}
                        <span className="angi-blog-title-highlight">Posts</span>
                    </h2>

                    <p className="angi-blog-subtitle">
                        Explore the latest articles, tutorials and technology updates from our team.
                    </p>
                </header>

                <div className="angi-blog-grid">{cards}</div>

                <div className="angi-blog-footer">
                    <Link to="/blog" className="angi-blog-view-all">
                        View All Posts
                        <FaArrowRight aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default Blog;
