import React from 'react';
import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';

const BlogBreadcrumbs = ({ post }) => (
  <nav className="blog-breadcrumbs" aria-label="Breadcrumb">
    <Link to="/">Home</Link>
    <span className="blog-breadcrumbs__sep"><FaChevronRight aria-hidden="true" size={10} /></span>
    <Link to="/blog">Blog</Link>
    {post?.category?.slug ? (
      <>
        <span className="blog-breadcrumbs__sep"><FaChevronRight aria-hidden="true" size={10} /></span>
        <Link to={`/blog?category=${encodeURIComponent(post.category.slug)}`}>{post.category.name}</Link>
      </>
    ) : null}
    <span className="blog-breadcrumbs__sep"><FaChevronRight aria-hidden="true" size={10} /></span>
    <span className="blog-breadcrumbs__current">{post?.title}</span>
  </nav>
);

export default BlogBreadcrumbs;
