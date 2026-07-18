import { useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { extractSectionContent } from './useAboutPage';

/**
 * Loads the canonical *real* AngiSoft services from the About "serviceMap"
 * section. This is the single source of truth the Services list and detail
 * pages render — keeps them decoupled from the generic `Service` CRUD model
 * and lets us later point this hook at a dedicated endpoint if needed.
 */
export const useServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const list = await apiGet('/about-sections');
        const serviceMap = extractSectionContent(list, 'serviceMap');
        setServices(Array.isArray(serviceMap?.services) ? serviceMap.services : []);
      } catch (err) {
        setError(err.message || 'Failed to load services.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { services, loading, error };
};

/**
 * Finds a single service by id (or slug) from the canonical serviceMap list.
 * Returns { service, loading, error } so a detail page can resolve the URL
 * param (/services/:id) against the live data.
 */
export const useService = (identifier) => {
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!identifier) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const list = await apiGet('/about-sections');
        const serviceMap = extractSectionContent(list, 'serviceMap');
        const services = (serviceMap && Array.isArray(serviceMap.services)) ? serviceMap.services : [];
        const found = services.find((s) => s.id === identifier || s.slug === identifier);
        if (found) {
          setService({
            ...found,
            images: Array.isArray(found.images) && found.images.length
              ? found.images
              : (found.imageUrl ? [found.imageUrl] : []),
            description: found.description || '',
          });
        } else {
          setError('Service not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to load service.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [identifier]);

  return { service, loading, error };
};

export default useServices;
