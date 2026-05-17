import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { FaEnvelope, FaPhone, FaWhatsapp, FaArrowRight } from 'react-icons/fa';

const AnnouncementBar = () => {
  const { colors } = useTheme();

  return (
    <div
      className="relative z-[60] hidden md:block"
      style={{
        background: 'linear-gradient(135deg, #061324 0%, #07142B 100%)',
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <a
            href="mailto:info@angisoft.co.ke"
            className="flex items-center gap-2 transition-colors hover:text-white"
            style={{ color: 'rgba(245,247,250,0.7)' }}
          >
            <FaEnvelope className="text-xs" style={{ color: colors.secondary }} />
            info@angisoft.co.ke
          </a>
          <a
            href="tel:+254710398690"
            className="flex items-center gap-2 transition-colors hover:text-white"
            style={{ color: 'rgba(245,247,250,0.7)' }}
          >
            <FaPhone className="text-xs" style={{ color: colors.secondary }} />
            +254 710 398 690
          </a>
          <a
            href="https://wa.me/254710398690"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-colors hover:text-white"
            style={{ color: 'rgba(245,247,250,0.7)' }}
          >
            <FaWhatsapp className="text-xs" style={{ color: '#25D366' }} />
            WhatsApp
          </a>
        </div>
        <Link
          to="/book"
          className="flex items-center gap-2 font-medium transition-all hover:gap-3"
          style={{ color: colors.secondary }}
        >
          Get a Free Consultation
          <FaArrowRight className="text-xs" />
        </Link>
      </div>
    </div>
  );
};

export default AnnouncementBar;
