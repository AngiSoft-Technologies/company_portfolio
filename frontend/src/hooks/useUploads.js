import { useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { resolveAssetUrl } from '../utils/constants';

let cache = null;
let pending = null;

const fetchUploads = (ownerType) => {
  const endpoint = ownerType ? `/uploads?ownerType=${encodeURIComponent(ownerType)}` : '/uploads';
  if (!pending) {
    pending = apiGet(endpoint)
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        cache = rows;
        return rows;
      })
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
};

/**
 * Reads public synced media from the backend uploads endpoint
 * (GET /api/uploads) instead of relying on hard-coded static paths.
 *
 * Returns:
 *  - files:     all public File rows
 *  - byOwnerType(type): rows filtered to a given ownerType
 *  - urlFor(id): the origin-resolved, browser-ready URL for a stored file id
 *  - loading / error
 */
export const useUploads = (ownerType) => {
  const [files, setFiles] = useState(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (cache) {
      setLoading(false);
      return;
    }
    fetchUploads(ownerType)
      .then((data) => {
        if (!active) return;
        setFiles(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load uploads');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ownerType]);

  const byOwnerType = (type) => (files || []).filter((f) => f.ownerType === type);
  const urlFor = (id) => {
    const f = (files || []).find((x) => x.id === id);
    return f ? resolveAssetUrl(f.url) : '';
  };

  return { files: files || [], byOwnerType, urlFor, loading, error };
};

export default useUploads;
