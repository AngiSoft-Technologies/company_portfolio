import { useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';

let cachedCopy = null;
let pendingRequest = null;

const fetchCopy = () => {
  if (!pendingRequest) {
    pendingRequest = apiGet('/site/ui')
      .then((data) => {
        cachedCopy = data || null;
        return cachedCopy;
      })
      .catch((err) => {
        pendingRequest = null;
        throw err;
      });
  }
  return pendingRequest;
};

export const useSiteCopy = () => {
  const [copy, setCopy] = useState(cachedCopy);
  const [loading, setLoading] = useState(!cachedCopy);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (cachedCopy) {
      setLoading(false);
      return;
    }
    fetchCopy()
      .then((data) => {
        if (!active) return;
        setCopy(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load UI copy');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { copy, loading, error };
};
