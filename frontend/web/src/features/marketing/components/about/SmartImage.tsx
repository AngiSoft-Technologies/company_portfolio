// @ts-nocheck
import React, { useState } from 'react';

/**
 * Image that falls back to an on-brand gradient tile when the source fails to
 * load (e.g. a photo asset not yet supplied). Keeps the dark design intact.
 */
const SmartImage = ({ src, alt = '', className = '', loading = 'lazy', fallbackText = 'AngiSoft' }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] text-center text-sm font-semibold text-[var(--text-muted)] ${className}`}
        aria-label={alt}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export default SmartImage;
