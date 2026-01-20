import React, { useState } from 'react';
import Chip from '@mui/material/Chip';

function ChipSelector({ label, placeholder, options, selected, onChange, suggestionTitle = 'Suggested based on your profile', theme = 'light' }) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  const filteredOptions = options.filter(
    (opt) =>
      !selected.includes(opt) &&
      (!input || opt.toLowerCase().includes(input.toLowerCase()))
  );

  // Theme-based styles
  const bgClass = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
  const textClass = theme === 'dark' ? 'text-gray-200' : 'text-gray-600';
  const inputClass = theme === 'dark'
    ? 'bg-gray-900 border-gray-700 text-gray-100'
    : 'bg-white border-gray-300 text-gray-900';

  const handleAdd = (opt) => {
    onChange([...selected, opt]);
    setInput('');
  };

  const handleRemove = (opt) => {
    onChange(selected.filter((item) => item !== opt));
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <label className={`block font-medium mb-1 ${textClass}`}>{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map((opt) => (
          <Chip
            key={opt}
            label={opt}
            onDelete={() => handleRemove(opt)}
            color="primary"
            variant="filled"
            style={{ marginBottom: 4 }}
          />
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          className={`border rounded px-2 py-1 min-w-[180px] outline-none ${inputClass}`}
          onFocus={() => setShowSuggestions(true)}
        />
      </div>
      {showSuggestions && filteredOptions.length > 0 && (
        <div className={`rounded p-3 mb-2 border ${bgClass}`}> 
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm ${textClass}`}>{suggestionTitle}</span>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-700 text-lg"
              onClick={() => setShowSuggestions(false)}
              aria-label="Close suggestions"
            >×</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredOptions.map((opt) => (
              <Chip
                key={opt}
                label={opt}
                onClick={() => handleAdd(opt)}
                variant="outlined"
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChipSelector; 