const MediaBackdrop = ({
  image,
  overlay = 'rgba(7, 20, 43, 0.72)',
  position = 'center',
  pattern = true,
  children,
}) => {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden={!children}>
      {image && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage: `url("${image}")`,
            backgroundPosition: position,
          }}
          aria-hidden="true"
        />
      )}
      <div className="absolute inset-0" style={{ background: overlay }} aria-hidden="true" />
      {pattern && (
        <div
          className="absolute inset-0 opacity-50 angi-technical-grid"
          aria-hidden="true"
        />
      )}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
};

export default MediaBackdrop;
