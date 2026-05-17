import { ANGISOFT_LOGOS } from '../../utils/brandAssets';

const LOGO_ASSETS = {
  full: ANGISOFT_LOGOS.full,
  fullSvg: ANGISOFT_LOGOS.fullSvg,
  symbol: ANGISOFT_LOGOS.symbol,
  logoImg: ANGISOFT_LOGOS.logoImg,
};

const SIZE_STYLES = {
  sm: { width: '7rem' },
  md: { width: '10rem' },
  lg: { width: '13rem' },
  xl: { width: '16rem' },
  xxl: { width: '20rem' },
  xxxl: { width: '25rem' },
  xxxxl: { width: '30rem' },
  footerl: { width: '40rem', height: 'auto' },
  symbolSm: { width: '2.25rem', height: '2.25rem' },
  symbolMd: { width: '3.25rem', height: '3.25rem' },
  symbolLg: { width: '5rem', height: '5rem' },
};

const backgroundStyle = {
  background: 'linear-gradient(135deg, rgba(6, 19, 36, 0.96), rgba(0, 194, 255, 0.18))',
  border: '1px solid rgba(0, 194, 255, 0.35)',
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
};

const AngiSoftLogo = ({
  variant = 'full',
  size = 'md',
  className = '',
  showBackground = false,
  alt = 'AngiSoft Technologies',
}) => {
  const isSymbol = variant === 'symbol';
  const asset = LOGO_ASSETS[variant] || LOGO_ASSETS.full;
  const imgSize = SIZE_STYLES[size] || SIZE_STYLES[isSymbol ? 'symbolMd' : 'md'];

  const img = (
    <img
      src={asset}
      alt={alt}
      className="block object-contain"
      style={imgSize}
      loading="eager"
      decoding="async"
    />
  );

  if (!showBackground) {
    return <span className={`inline-flex items-center ${className}`}>{img}</span>;
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl p-2 ${className}`}
      style={backgroundStyle}
    >
      {img}
    </span>
  );
};

export default AngiSoftLogo;
