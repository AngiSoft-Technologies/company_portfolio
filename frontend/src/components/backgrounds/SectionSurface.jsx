const variantStyles = {
  plain: {
    background: 'transparent',
  },
  paper: {
    background: 'rgba(245, 247, 250, 0.96)',
    color: '#07142B',
  },
  blueprint: {
    background:
      'linear-gradient(rgba(0, 194, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 194, 255, 0.06) 1px, transparent 1px), #0B1E3D',
    backgroundSize: '40px 40px',
  },
  darkCta: {
    background: 'rgba(11, 30, 61, 0.92)',
    border: '1px solid rgba(0, 194, 255, 0.22)',
  },
  muted: {
    background: 'rgba(11, 30, 61, 0.78)',
    border: '1px solid rgba(0, 194, 255, 0.16)',
  },
};

const SectionSurface = ({
  as: Component = 'section',
  variant = 'plain',
  className = '',
  style = {},
  children,
  ...props
}) => {
  const variantStyle = variantStyles[variant] || variantStyles.plain;

  return (
    <Component
      className={className}
      style={{
        ...variantStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default SectionSurface;
