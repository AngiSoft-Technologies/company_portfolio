import { useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';

let cachedBooking = null;
let pendingRequest = null;

const fetchBooking = () => {
  if (!pendingRequest) {
    pendingRequest = apiGet('/site/booking')
      .then((data) => {
        cachedBooking = data || null;
        return cachedBooking;
      })
      .catch((err) => {
        pendingRequest = null;
        throw err;
      });
  }
  return pendingRequest;
};

export const useBookingSettings = () => {
  const [settings, setSettings] = useState(cachedBooking);
  const [loading, setLoading] = useState(!cachedBooking);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (cachedBooking) {
      setLoading(false);
      return;
    }
    fetchBooking()
      .then((data) => {
        if (!active) return;
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load booking settings');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { settings, loading, error };
};
