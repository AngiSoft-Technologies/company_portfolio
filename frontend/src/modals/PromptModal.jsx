import React, { useState, useEffect, useRef } from 'react';


const icons = {
  success: <span className="modal-icon modal-icon-success" />,
  error: <span className="modal-icon modal-icon-error" />,
  warning: <span className="modal-icon modal-icon-warning" />,
  info: <span className="modal-icon modal-icon-info" />,
};

const PromptModal = ({ open, type = 'info', message, defaultValue = '', placeholder = '', onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel', inputType = 'text', inputLabel = '' }) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className={`modal-card modal-card-${type}`}>
        <div className="modal-icon-container">{icons[type] || icons.info}</div>
        <div className="modal-message">{message}</div>
        {inputLabel && <label className="modal-label">{inputLabel}</label>}
        <input
          ref={inputRef}
          type={inputType}
          className="modal-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
        />
        <div className="modal-actions">
          <button
            className="modal-btn modal-btn-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`modal-btn modal-btn-confirm modal-btn-confirm-${type}`}
            onClick={() => onConfirm(value)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptModal; 