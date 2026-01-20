import React from 'react';

const CrudModal = ({ open, onClose, title, children, width = 480 }) => {
  if (!open) return null;
  return (
    <div className="crud-modal-overlay" onClick={onClose}>
      <div
        className="crud-modal"
        style={{ width, maxWidth: '95vw' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="crud-modal-header">
          <h2 className="crud-modal-title">{title}</h2>
          <button className="crud-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="crud-modal-content">{children}</div>
      </div>
    </div>
  );
};

export default CrudModal; 