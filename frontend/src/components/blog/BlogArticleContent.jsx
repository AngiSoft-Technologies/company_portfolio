import React, { useMemo } from 'react';
import { renderContent, parseArticleBlocks, renderTextBlock } from '../../utils/blog/blogContent';
import { toEmbedSrc } from './mediaEmbedHelpers';

// Renders blog content after sanitizing. Supports HTML, markdown and plain
// text (detected heuristically in blogContent.detectContentType). Content is
// ALWAYS passed through DOMPurify before reaching dangerouslySetInnerHTML.
//
// For "article" posts the body may weave inline media fences (video/audio/
// link) among the text — see parseArticleBlocks. We stream those as a true
// flowing document so a single publication can mix prose, images, a mid-article
// video, and links, while heading IDs still line up with the table of contents.
const BlogArticleContent = React.forwardRef(function BlogArticleContent({ post }, ref) {
  const blocks = useMemo(() => parseArticleBlocks(post?.content), [post?.content]);

  if (!post?.content) {
    return (
      <div className="blog-content" ref={ref}>
        <p>No content available for this article.</p>
      </div>
    );
  }

  // Single text block → standard renderer (also covers HTML/plain content).
  if (blocks.length === 1 && blocks[0].kind === 'text') {
    const html = renderContent(blocks[0].raw);
    if (!html) {
      return (
        <div className="blog-content" ref={ref}>
          <p>No content available for this article.</p>
        </div>
      );
    }
    return (
      <div className="blog-content" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
    );
  }

  // Mixed-media article: render each block in document order.
  return (
    <div className="blog-content blog-content--mixed" ref={ref}>
      {blocks.map((block, i) => {
        if (block.kind === 'text') {
          return (
            <div
              key={`t-${i}`}
              className="blog-content__block"
              dangerouslySetInnerHTML={{ __html: renderTextBlock(block.raw) }}
            />
          );
        }
        if (block.kind === 'video') {
          const src = toEmbedSrc(block.raw);
          if (!src) return null;
          return (
            <figure key={`v-${i}`} className="blog-inline-media blog-inline-media--video">
              <div className="blog-inline-media__frame">
                <iframe
                  src={src}
                  title="Embedded video"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </figure>
          );
        }
        if (block.kind === 'audio') {
          const url = block.raw.trim();
          if (!/^https?:\/\//i.test(url)) return null;
          return (
            <figure key={`a-${i}`} className="blog-inline-media blog-inline-media--audio">
              <audio controls preload="metadata" src={url}>
                Your browser does not support the audio element.
              </audio>
            </figure>
          );
        }
        if (block.kind === 'link') {
          const [url, ...rest] = block.raw.split('\n');
          const label = rest.join(' ').trim() || url.trim();
          if (!/^https?:\/\//i.test(url.trim())) return null;
          return (
            <figure key={`l-${i}`} className="blog-inline-media blog-inline-media--link">
              <a href={url.trim()} target="_blank" rel="noopener noreferrer">
                <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                <span>{label.trim()}</span>
              </a>
            </figure>
          );
        }
        return null;
      })}
    </div>
  );
});

export default BlogArticleContent;
