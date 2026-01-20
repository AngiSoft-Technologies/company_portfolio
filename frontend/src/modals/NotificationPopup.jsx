import React, { useEffect } from 'react';
const icons = {
  success: <span className="modal-icon modal-icon-success" />,
  error: <span className="modal-icon modal-icon-error" />,
  warning: <span className="modal-icon modal-icon-warning" />,
  info: <span className="modal-icon modal-icon-info" />,
};

const NotificationPopup = ({ type = 'info', message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose && onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-card modal-card-${type}`} role="alert">
        <div className="modal-icon-container">{icons[type] || icons.info}</div>
        <span className="modal-message">{message}</span>
        <button
          onClick={onClose}
          className="modal-btn modal-btn-close"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default NotificationPopup;
