import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../utils/constants';
import { FaFileAlt, FaDownload, FaCloudUploadAlt } from 'react-icons/fa';

/**
 * Lists attachments recorded on the booking (from booking.files / linked File
 * rows) and provides a drag-less upload control. Uploads go to
 * POST /bookings/:publicReference/files as multipart with the tracking token.
 */
const resolveUrl = (f) => {
    if (!f?.url) return null;
    if (f.url.startsWith('http')) return f.url;
    return `${API_BASE_URL}${f.url.startsWith('/') ? '' : '/'}${f.url}`;
};

const BookingAttachments = ({ files = [], onUpload, uploading }) => {
    const { colors } = useTheme();
    return (
        <div className="booking-attachments">
            {files.length > 0 && (
                <ul className="booking-attachments-list">
                    {files.map((f) => (
                        <li key={f.id} className="booking-attachments-item">
                            <FaFileAlt style={{ color: colors.primary }} />
                            <span className="booking-attachments-name">{f.originalName || f.filename || 'File'}</span>
                            {resolveUrl(f) && (
                                <a className="booking-attachments-dl" href={resolveUrl(f)} target="_blank" rel="noreferrer">
                                    <FaDownload /> View
                                </a>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {onUpload && (
                <label className={`booking-attachments-upload${uploading ? ' is-uploading' : ''}`}>
                    <FaCloudUploadAlt />
                    <span>{uploading ? 'Uploading…' : 'Add a file'}</span>
                    <input
                        type="file"
                        multiple
                        disabled={uploading}
                        onChange={(e) => onUpload(e.target.files)}
                        style={{ display: 'none' }}
                    />
                </label>
            )}
        </div>
    );
};

export default BookingAttachments;
