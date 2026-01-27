import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaDownload, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt, FaEye } from 'react-icons/fa';

const getFileIcon = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return { icon: FaFilePdf, color: '#EF4444' };
    case 'doc':
    case 'docx':
      return { icon: FaFileWord, color: '#2563EB' };
    case 'xls':
    case 'xlsx':
      return { icon: FaFileExcel, color: '#10B981' };
    case 'ppt':
    case 'pptx':
      return { icon: FaFilePowerpoint, color: '#F59E0B' };
    default:
      return { icon: FaFileAlt, color: '#6B7280' };
  }
};

const DocumentCard = ({
  title,
  description,
  filename,
  size,
  downloadUrl,
  previewUrl,
  date,
  className = ''
}) => {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const { icon: FileIcon, color: iconColor } = getFileIcon(filename);

  return (
    <div
      className={`group relative rounded-2xl p-6 transition-all duration-300 ${className}`}
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? `0 20px 40px rgba(0,0,0,0.1), 0 0 30px ${colors.primary}10`
          : '0 4px 6px rgba(0,0,0,0.05)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon & Title */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <FileIcon size={28} style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className="font-semibold text-lg mb-1 truncate"
            style={{ color: colors.text }}
          >
            {title}
          </h4>
          <p
            className="text-sm"
            style={{ color: colors.textSecondary }}
          >
            {filename} • {size}
          </p>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p
          className="text-sm mb-4 line-clamp-2"
          style={{ color: colors.textSecondary }}
        >
          {description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: colors.border }}>
        {date && (
          <span className="text-xs" style={{ color: colors.textMuted }}>
            {new Date(date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </span>
        )}
        
        <div className="flex items-center gap-2">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ 
                backgroundColor: colors.backgroundSecondary,
                color: colors.textSecondary
              }}
            >
              <FaEye size={16} />
            </a>
          )}
          <a
            href={downloadUrl}
            download={filename}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-105"
            style={{ backgroundColor: colors.primary }}
          >
            <FaDownload size={14} />
            Download
          </a>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
