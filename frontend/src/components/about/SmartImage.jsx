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
        className={`flex items-center justify-center bg-gradient-to-br from-[#0B1E3D] to-[#07142B] text-center text-sm font-semibold text-white/40 ${className}`}
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
