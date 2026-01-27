import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  FaPalette, 
  FaCheck,
  FaTimes
} from 'react-icons/fa';

const ThemeSwitcher = ({ variant = 'full' }) => {
  const { themeId, mode, allThemes, setTheme, toggleMode, setMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Compact version - just mode toggle
  if (variant === 'compact') {
    return (
      <button
        onClick={toggleMode}
        className="px-3 py-2 rounded-lg transition-all duration-300 text-sm font-medium"
        style={{ 
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)'
        }}
        aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
      >
        {mode === 'dark' ? 'Light' : 'Dark'}
      </button>
    );
  }

  // Icon only with dropdown
  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg transition-all duration-300 hover:scale-110"
          style={{ 
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--primary)'
          }}
          aria-label="Open theme picker"
        >
          <FaPalette size={18} />
        </button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <div 
              className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl z-50 p-4"
              style={{ 
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Choose Theme
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <FaTimes size={14} />
                </button>
              </div>
              
              {/* Mode Toggle */}
              <div 
                className="flex items-center justify-between p-2 rounded-lg mb-3"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>Mode</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setMode('light')}
                    className="px-3 py-1.5 rounded-lg transition-all text-sm font-medium"
                    style={{ 
                      backgroundColor: mode === 'light' ? 'var(--primary)' : 'transparent',
                      color: mode === 'light' ? '#FFFFFF' : 'var(--text-secondary)'
                    }}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setMode('dark')}
                    className="px-3 py-1.5 rounded-lg transition-all text-sm font-medium"
                    style={{ 
                      backgroundColor: mode === 'dark' ? 'var(--primary)' : 'transparent',
                      color: mode === 'dark' ? '#FFFFFF' : 'var(--text-secondary)'
                    }}
                  >
                    Dark
                  </button>
                </div>
              </div>

              {/* Theme Options */}
              <div className="space-y-2">
                {Object.values(allThemes).map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setTheme(theme.id);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg transition-all hover:scale-[1.02]"
                    style={{ 
                      backgroundColor: themeId === theme.id ? 'var(--primary)' : 'var(--bg-secondary)',
                      color: themeId === theme.id ? '#FFFFFF' : 'var(--text-primary)'
                    }}
                  >
                    {/* Color Preview */}
                    <div className="flex gap-1">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.colors.secondary }}
                      />
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{theme.name}</div>
                    </div>
                    
                    {themeId === theme.id && <FaCheck size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full panel version
  return (
    <div 
      className="p-6 rounded-2xl"
      style={{ 
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-color)'
      }}
    >
      <h3 
        className="text-xl font-bold mb-4 flex items-center gap-2"
        style={{ color: 'var(--text-primary)' }}
      >
        <FaPalette style={{ color: 'var(--primary)' }} />
        Customize Theme
      </h3>

      {/* Mode Toggle */}
      <div className="mb-6">
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          Appearance Mode
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('light')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all ${
              mode === 'light' ? 'ring-2' : ''
            }`}
            style={{ 
              backgroundColor: mode === 'light' ? 'var(--primary)' : 'var(--bg-secondary)',
              color: mode === 'light' ? '#FFFFFF' : 'var(--text-primary)',
              ringColor: 'var(--primary)'
            }}
          >
            <span>Light</span>
          </button>
          <button
            onClick={() => setMode('dark')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all ${
              mode === 'dark' ? 'ring-2' : ''
            }`}
            style={{ 
              backgroundColor: mode === 'dark' ? 'var(--primary)' : 'var(--bg-secondary)',
              color: mode === 'dark' ? '#FFFFFF' : 'var(--text-primary)',
              ringColor: 'var(--primary)'
            }}
          >
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Theme Selection */}
      <div>
        <label 
          className="block text-sm font-medium mb-3"
          style={{ color: 'var(--text-secondary)' }}
        >
          Color Theme
        </label>
        <div className="grid grid-cols-1 gap-3">
          {Object.values(allThemes).map((theme) => (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01] ${
                themeId === theme.id ? 'ring-2' : ''
              }`}
              style={{ 
                backgroundColor: themeId === theme.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                ringColor: 'var(--primary)'
              }}
            >
              {/* Color Preview Circles */}
              <div className="flex -space-x-2">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: theme.colors.secondary }}
                />
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: theme.colors.accent }}
                />
              </div>
              
              {/* Theme Info */}
              <div className="flex-1 text-left">
                <div 
                  className="font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {theme.name}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {theme.description}
                </div>
              </div>
              
              {/* Selected Indicator */}
              {themeId === theme.id && (
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <FaCheck size={12} color="#FFFFFF" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeSwitcher;
