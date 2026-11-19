// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';

/*
|--------------------------------------------------------------------------
| Real, interactive delivery map (Leaflet + OSM/CARTO tiles)
|--------------------------------------------------------------------------
|
| Inspiration: Stripe/Linear contact maps — quiet monochrome cartography that
| matches the page instead of a loud default embed. CARTO's free light/dark
| basemaps (OSM data, no API key) give us a real map in both themes.
| Structure keeps the ITransition geography pattern: labelled reach rings
| around a truthful HQ marker in Nairobi.
|
| Leaflet loads on demand from the CDN so the bundle stays lean; if the CDN
| is unreachable the section degrades to a clear retry state.
*/

const LEAFLET_VERSION = '1.9.4';
const LEAFLET_BASE = `https://unpkg.com/leaflet@${LEAFLET_VERSION}`;

const TILES = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

const NAIROBI = [-1.2864, 36.8172];

let leafletPromise = null;

const loadLeaflet = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const css = document.createElement('link');
      css.id = 'leaflet-css';
      css.rel = 'stylesheet';
      css.href = `${LEAFLET_BASE}/dist/leaflet.css`;
      document.head.appendChild(css);
    }

    const existing = document.getElementById('leaflet-js');
    if (existing) {
      if (window.L) resolve(window.L);
      else existing.addEventListener('load', () => resolve(window.L), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = `${LEAFLET_BASE}/dist/leaflet.js`;
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error('Leaflet missing')));
    script.onerror = () => reject(new Error('Leaflet CDN unreachable'));
    document.head.appendChild(script);
  });

  return leafletPromise;
};

const currentTheme = () =>
  document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

const AboutDeliveryMap = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileRef = useRef(null);
  const [status, setStatus] = useState('loading');

  const boot = useCallback(async () => {
    setStatus('loading');
    let L;
    try {
      L = await loadLeaflet();
    } catch {
      setStatus('error');
      return;
    }
    if (!containerRef.current) return;

    const firstRun = !mapRef.current;
    if (firstRun) {
      mapRef.current = L.map(containerRef.current, {
        center: NAIROBI,
        zoom: 5,
        minZoom: 3,
        maxZoom: 10,
        scrollWheelZoom: false,
        attributionControl: true,
      });
    }

    const map = mapRef.current;
    const theme = currentTheme();
    const config = TILES[theme];

    if (tileRef.current) {
      map.removeLayer(tileRef.current);
      tileRef.current = null;
    }

    tileRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      subdomains: 'abcd',
      maxZoom: 10,
    }).addTo(map);

    if (firstRun) {
      const icon = L.divIcon({
        className: 'about-map-hq-icon',
        html: '<span class="about-map-hq-dot" aria-hidden="true"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      L.marker(NAIROBI, { icon, title: 'AngiSoft headquarters — Nairobi, Kenya' })
        .addTo(map)
        .bindPopup(
          '<strong>AngiSoft headquarters</strong><br/>Nairobi, Kenya',
          { closeButton: false },
        );

      const rings = [
        {
          radius: 220,
          label: 'Operating base — Nairobi metro and direct clients',
          weight: 2,
        },
        {
          radius: 1400,
          label: 'Primary regional market — East Africa',
          weight: 1.5,
        },
        {
          radius: 3800,
          label: 'Long-term product reach — wider Africa (remote delivery)',
          weight: 1,
        },
      ];

      rings.forEach((ring) => {
        L.circle(NAIROBI, {
          radius: ring.radius,
          color: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#0875FF',
          weight: ring.weight,
          opacity: 0.55,
          fillColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#0875FF',
          fillOpacity: 0.04,
          dashArray: ring.radius > 1000 ? '4 6' : undefined,
        })
          .addTo(map)
          .bindTooltip(ring.label, { direction: 'top' });
      });
    }

    setStatus('ready');
  }, []);

  useEffect(() => {
    boot();

    const observer = new MutationObserver(() => {
      if (mapRef.current && tileRef.current) {
        const theme = currentTheme();
        const config = TILES[theme];
        const map = mapRef.current;
        map.removeLayer(tileRef.current);
        tileRef.current = window.L.tileLayer(config.url, {
          attribution: config.attribution,
          subdomains: 'abcd',
          maxZoom: 10,
        }).addTo(map);
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      observer.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileRef.current = null;
      }
    };
  }, [boot]);

  return (
    <div className="about-leaflet-shell">
      {status === 'error' ? (
        <div className="about-leaflet-fallback" role="region" aria-label="Delivery map unavailable">
          <p className="about-leaflet-fallback-title">The delivery map could not be loaded.</p>
          <p className="about-leaflet-fallback-text">
            AngiSoft is headquartered in Nairobi, Kenya and delivers remotely across East Africa and the
            wider continent.
          </p>
          <button
            type="button"
            onClick={boot}
            className="about-leaflet-retry"
          >
            Try again
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="about-leaflet-map"
          role="region"
          aria-label="Interactive map: AngiSoft headquarters in Nairobi with delivery reach across East Africa"
        />
      )}
    </div>
  );
};

export default AboutDeliveryMap;
