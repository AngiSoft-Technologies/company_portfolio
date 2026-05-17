const AngiSoftFooterWave = ({ className = '', style = {}, children }) => {
  return (
    <footer
      className={`relative overflow-hidden bg-[#F5F7FA] text-[#F5F7FA] ${className}`}
      style={style}
    >
      <svg
        viewBox="0 0 1440 620"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="angiFooterBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#061324" />
            <stop offset="28%" stopColor="#071C70" />
            <stop offset="52%" stopColor="#123DFF" />
            <stop offset="78%" stopColor="#00AFFF" />
            <stop offset="100%" stopColor="#061324" />
          </linearGradient>
        </defs>

        <path
          d="M0 0 C160 38 310 50 480 50 C690 50 805 46 970 58 C1130 70 1240 95 1440 42 L1440 620 L0 620 Z"
          fill="#24B947"
        />

        <path
          d="M0 46 C180 58 380 55 610 56 C820 58 1008 76 1185 108 C1305 130 1375 132 1440 130 L1440 620 L0 620 Z"
          fill="#061324"
        />

        <path
          d="M0 52 C180 64 390 58 610 60 C820 62 1005 80 1180 110 C1305 132 1375 134 1440 132 L1440 620 L0 620 Z"
          fill="url(#angiFooterBlue)"
        />

        <path
          d="M575 62 C790 66 980 82 1145 114 C1255 136 1345 158 1440 170 L1440 620 L955 620 C910 400 820 185 575 62 Z"
          fill="#00AFFF"
          opacity="0.9"
        />
      </svg>

      <div
        className="relative z-20"
        style={{ paddingTop: '0.5rem' }}
      >
        {children}
      </div>
    </footer>
  );
};

export default AngiSoftFooterWave;