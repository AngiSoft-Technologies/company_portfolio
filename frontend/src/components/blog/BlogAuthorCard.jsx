import React from 'react';
import { Link } from 'react-router-dom';
import { formatAuthorName } from '../../utils/blog/blogFormatters';
import { resolveBlogImage, AvatarInitials } from './blogAssets';

// Author card. Links to staff page ONLY when a real author id is present.
// Falls back to "AngiSoft Team" — never invents a bio.
const BlogAuthorCard = ({ post }) => {
  const author = post?.author;
  const name = formatAuthorName(author) || 'AngiSoft Team';
  const hasStaffLink = author?.id;

  return (
    <section className="blog-author-card" aria-label="About the author">
      {author?.avatarUrl ? (
        <img className="blog-author-card__avatar" src={resolveBlogImage(author.avatarUrl) || author.avatarUrl} alt="" loading="lazy" />
      ) : (
        <AvatarInitials initials={author?.initials} className="blog-author-card__avatar" />
      )}
      <div>
        <div className="blog-author-card__name">{name}</div>
        <div className="blog-author-card__role">{author?.role || 'AngiSoft Technologies'}</div>
        {hasStaffLink ? (
          <Link className="blog-author-card__link" to={`/staff/${author.id}`}>
            View profile →
          </Link>
        ) : (
          <span className="blog-author-card__link">AngiSoft Team</span>
        )}
      </div>
    </section>
  );
};

export default BlogAuthorCard;
