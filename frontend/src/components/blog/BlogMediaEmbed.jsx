import React, { useMemo } from 'react';
import { resolveAssetUrl } from '../../utils/constants';
import { getContentType, supportsTranscript, formatVisibilityUntil } from '../../utils/blog/blogTypes';
import { toEmbedSrc, isExternalMedia } from './mediaEmbedHelpers';

// Renders the type-specific media block above (or instead of) the body text.
const BlogMediaEmbed = ({ post }) => {
  const type = getContentType(post?.contentType);
  const mediaUrl = post?.mediaUrl;
  const transcript = post?.transcript;

  const embedSrc = useMemo(() => toEmbedSrc(mediaUrl), [mediaUrl]);

  if (type.id === 'video' && embedSrc) {
    return (
      <figure className="blog-media blog-media--video">
        <div className="blog-media__frame">
          <iframe
            src={embedSrc}
            title={post.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {transcript ? (
          <figcaption className="blog-media__transcript">
            <h4><i className="fa-solid fa-file-lines" aria-hidden="true" /> Transcript</h4>
            <p>{transcript}</p>
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (type.id === 'audio' && isExternalMedia(mediaUrl)) {
    return (
      <figure className="blog-media blog-media--audio">
        <div className="blog-media__player">
          <audio controls preload="metadata" src={mediaUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
        <figcaption className="blog-media__transcript">
          <p className="blog-media__note">
            <i className="fa-solid fa-podcast" aria-hidden="true" /> Listen on the go — full transcript below.
          </p>
          {supportsTranscript(type.id) && transcript ? (
            <>
              <h4><i className="fa-solid fa-file-lines" aria-hidden="true" /> Transcript</h4>
              <p>{transcript}</p>
            </>
          ) : null}
        </figcaption>
      </figure>
    );
  }

  if (type.id === 'document') {
    const docSrc = isExternalMedia(mediaUrl) ? mediaUrl : resolveAssetUrl(mediaUrl);
    return (
      <figure className="blog-media blog-media--document">
        <a className="blog-media__doc-link" href={docSrc} target="_blank" rel="noopener noreferrer">
          <i className="fa-solid fa-file-arrow-down" aria-hidden="true" />
          <span>Open Document</span>
        </a>
        <figcaption className="blog-media__note">
          Opens in a new tab. {transcript ? 'Summary:' : ''} {transcript || ''}
        </figcaption>
      </figure>
    );
  }

  if ((type.id === 'code' || type.id === 'command') && post.content) {
    return (
      <figure className="blog-media blog-media--code">
        <div className="blog-code-block">
          <button
            type="button"
            className="blog-code-block__copy"
            onClick={() => navigator.clipboard?.writeText(post.content)}
            aria-label="Copy to clipboard"
          >
            <i className="fa-solid fa-copy" aria-hidden="true" /> Copy
          </button>
          <pre><code>{post.content}</code></pre>
        </div>
        {type.id === 'command' ? (
          <figcaption className="blog-media__note">
            <i className="fa-solid fa-terminal" aria="true" /> Run these in your terminal.
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (type.id === 'job') {
    const applyUrl = isExternalMedia(mediaUrl) ? mediaUrl : null;
    return (
      <figure className="blog-media blog-media--job">
        <a
          className="blog-media__apply"
          href={applyUrl || '#apply'}
          target={applyUrl ? '_blank' : undefined}
          rel={applyUrl ? 'noopener noreferrer' : undefined}
        >
          <i className="fa-solid fa-paper-plane" aria-hidden="true" />
          <span>Apply for this role</span>
        </a>
        <figcaption className="blog-media__note">
          {post.visibleUntil
            ? `Applications close ${formatVisibilityUntil(post.visibleUntil)}.`
            : 'Open until filled.'}
        </figcaption>
      </figure>
    );
  }

  // article / link: nothing special to embed; the body covers it.
  return null;
};

export default BlogMediaEmbed;
