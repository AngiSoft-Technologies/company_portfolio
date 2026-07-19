import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaClock, FaStar } from 'react-icons/fa';
import BlogCard from './BlogCard';

// Renders the featured post as an emphasized two-column block.
const BlogFeaturedPost = ({ post }) => {
  if (!post) return null;
  return (
    <section className="blog-section" aria-label="Featured article">
      <BlogCard post={post} featured />
    </section>
  );
};

export default BlogFeaturedPost;
