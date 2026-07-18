import { resolveAssetUrl } from './constants';

// Stored as paths under /uploads/public, but on production the SPA is served
// from the Netlify host while the files live on the API host. resolveAssetUrl
// rewrites them to absolute API-origin URLs so <img> requests always hit the
// server that actually serves /uploads (requesting them relatively against the
// www host returns the SPA index.html instead of the image).
export const ANGISOFT_LOGOS = {
  full: resolveAssetUrl('/uploads/public/images/Logos/AngiSoft_Dark_Background_Logo-removebg.svg'),
  fullSvg: resolveAssetUrl('/uploads/public/images/Logos/AngiSoft_Dark_Background_Logo-removebg.svg'),
  symbol: resolveAssetUrl('/uploads/public/images/Logos/logo-symbol.svg'),
  logoImg: resolveAssetUrl('/uploads/public/images/Logos/AngiSoft_Dark_Background_Logo-removebg.png'),
};

export const PRODUCT_LOGOS = {
  petroflow: resolveAssetUrl('/uploads/public/images/Logos/petroflow-logo.png'),
  dukaflow: resolveAssetUrl('/uploads/public/images/Logos/duka-flow-logo.png'),
  kejalink: resolveAssetUrl('/uploads/public/images/Logos/keja-link-logo.png'),
  angitunes: resolveAssetUrl('/uploads/public/images/Logos/angitunes-logo.png'),
};

export const PRODUCT_ICONS = {
  petroflow: resolveAssetUrl('/uploads/public/images/Logos/petroflow-mobile-icon.png'),
  dukaflow: resolveAssetUrl('/uploads/public/images/Logos/duka-flow-mobile-icon.png'),
  kejalink: resolveAssetUrl('/uploads/public/images/Logos/kejalink-mobile-icon.png'),
  angitunes: resolveAssetUrl('/uploads/public/images/Logos/angitunes-mobile-icon.png'),
};
