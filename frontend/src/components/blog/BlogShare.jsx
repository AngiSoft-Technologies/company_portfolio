import React from 'react';
import { FaTwitter, FaLinkedin, FaFacebook, FaLink } from 'react-icons/fa';

const buildShareUrl = (network, url, title) => {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title || '');
  switch (network) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    default:
      return url;
  }
};

const BlogShare = ({ url, title }) => {
  const shareNetworks = ['twitter', 'linkedin', 'facebook'];
  const copyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  return (
    <div className="blog-share">
      <span className="blog-share__label">Share</span>
      <div className="blog-share__buttons">
        {shareNetworks.map((net) => (
          <a
            key={net}
            className={`blog-share__btn blog-share__btn--${net}`}
            href={buildShareUrl(net, url, title)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${net}`}
          >
            {net === 'twitter' ? <FaTwitter /> : net === 'linkedin' ? <FaLinkedin /> : <FaFacebook />}
          </a>
        ))}
        <button
          type="button"
          className="blog-share__btn blog-share__btn--copy"
          onClick={copyLink}
          aria-label="Copy link"
        >
          <FaLink />
        </button>
      </div>
    </div>
  );
};

export default BlogShare;
