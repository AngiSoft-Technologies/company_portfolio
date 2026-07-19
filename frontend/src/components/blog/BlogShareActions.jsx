import React, { useState } from 'react';
import { FaLink, FaWhatsapp, FaLinkedin, FaShareAlt, FaCheck } from 'react-icons/fa';
import { getBlogAbsoluteUrl, getBlogDetailPath } from '../../utils/blog/blogRoutes';

const BlogShareActions = ({ post }) => {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== 'undefined'
    ? getBlogAbsoluteUrl(post, window.location.origin)
    : getBlogDetailPath(post);

  const copyLink = async () => {
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: post.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user dismissed share or clipboard blocked */
    }
  };

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <div className="blog-share">
      <h2 className="blog-toc__title">Share this article</h2>
      <div className="blog-share__row">
        <button
          type="button"
          className={`blog-share__btn${copied ? ' blog-share__btn--copied' : ''}`}
          onClick={copyLink}
          aria-label="Copy link"
        >
          {copied ? <FaCheck aria-hidden="true" /> : <FaLink aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a className="blog-share__btn" href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
          <FaWhatsapp aria-hidden="true" /> WhatsApp
        </a>
        <a className="blog-share__btn" href={linkedin} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
          <FaLinkedin aria-hidden="true" /> LinkedIn
        </a>
        {typeof navigator !== 'undefined' && navigator.share ? (
          <button type="button" className="blog-share__btn" onClick={copyLink} aria-label="Share natively">
            <FaShareAlt aria-hidden="true" /> Share
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default BlogShareActions;
