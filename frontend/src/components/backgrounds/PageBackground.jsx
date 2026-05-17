import { BACKGROUND_VARIANTS } from '../../utils/backgroundAssets';

const patternStyles = {
  blueprint: {
    backgroundImage:
      'linear-gradient(rgba(0, 194, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 194, 255, 0.08) 1px, transparent 1px)',
    backgroundSize: '44px 44px',
  },
  paper: {
    backgroundImage:
      'linear-gradient(rgba(7, 20, 43, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(7, 20, 43, 0.035) 1px, transparent 1px)',
    backgroundSize: '32px 32px',
  },
};

const PageBackground = ({
  variant = 'plain',
  pattern = 'none',
  className = '',
  style = {},
  children,
}) => {
  const preset = BACKGROUND_VARIANTS[variant] || BACKGROUND_VARIANTS.plain;
  const hasImage = Boolean(preset.image);

  return (
    <main
      className={`relative overflow-hidden ${className}`}
      style={{
        minHeight: '100vh',
        backgroundColor: preset.background,
        color: preset.color,
        ...style,
      }}
    >
      {hasImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("${preset.image}")`,
            backgroundPosition: preset.position || 'center',
          }}
          aria-hidden="true"
        />
      )}
      {hasImage && (
        <div
          className="absolute inset-0"
          style={{ background: preset.overlay || 'rgba(7, 20, 43, 0.72)' }}
          aria-hidden="true"
        />
      )}
      {pattern !== 'none' && patternStyles[pattern] && (
        <div
          className="absolute inset-0 opacity-70"
          style={patternStyles[pattern]}
          aria-hidden="true"
        />
      )}
      <div className="relative z-10">{children}</div>
    </main>
  );
};

export default PageBackground;
