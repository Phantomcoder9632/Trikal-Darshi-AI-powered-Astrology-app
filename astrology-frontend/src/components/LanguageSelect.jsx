import React, { useState, useRef, useEffect } from 'react';

// Custom high-quality SVG flag and globe icons to prevent "IN" text rendering on Windows systems
const GlobeIcon = () => (
  <svg 
    className="w-4 h-4 text-primary shrink-0" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.8" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IndiaFlagIcon = () => (
  <svg 
    className="w-4 h-3 rounded-xs shadow-xs shrink-0 object-cover" 
    viewBox="0 0 900 600"
    style={{ border: '1px solid rgba(0,0,0,0.08)' }}
  >
    <rect width="900" height="200" fill="#FF9933" />
    <rect y="200" width="900" height="200" fill="#FFFFFF" />
    <rect y="400" width="900" height="200" fill="#138808" />
    <g transform="translate(450,300)">
      <circle r="92" fill="none" stroke="#000080" strokeWidth="8" />
      <circle r="16" fill="#000080" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="0"
          y1="0"
          x2="0"
          y2="-92"
          stroke="#000080"
          strokeWidth="6"
          transform={`rotate(${i * 15})`}
        />
      ))}
    </g>
  </svg>
);

// Sacred Lotus icon for Bengali/Vedic theme representation
const LotusIcon = () => (
  <svg 
    className="w-4 h-4 shrink-0 text-[#e066a6]" 
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    {/* Elegant stylized lotus petals */}
    <path d="M12 21a9 9 0 0 1-5-1.5c-1-.7-1.7-1.8-2-3a5.5 5.5 0 0 1 1-4.8 5 5 0 0 1 3.5-1.7c.3 0 .7.1 1 .2a8.6 8.6 0 0 0 1.5-3.2 8.6 8.6 0 0 0 .8-3.5 1 1 0 0 1 1.4-.8 1 1 0 0 1 .6.8c0 1.2.3 2.4.8 3.5a8.6 8.6 0 0 0 1.5 3.2c.3-.1.7-.2 1-.2a5 5 0 0 1 3.5 1.7 5.5 5.5 0 0 1 1 4.8c-.3 1.2-1 2.3-2 3a9 9 0 0 1-5 1.5z" opacity="0.15" />
    <path d="M12 22s-2.5-3-2.5-5.5S11 12 12 12s2.5 2 2.5 4.5S12 22 12 22z" fill="#c9952a" />
    <path d="M12 22c-2 0-5.5-2.5-5.5-5s3-4.5 5.5-5 5.5 2.5 5.5 5-3.5 5-5.5 5z" fill="#e066a6" opacity="0.8" />
    <path d="M12 22c-1.5 0-3.5-1.5-3.5-3.5s2-3.5 3.5-4 3.5 2 3.5 4-2 3.5-3.5 3.5z" fill="#ff9ec7" />
    <path d="M12 22s-1-2-1-3.5 1-2.5 1-2.5 1 1 1 2.5-1 3.5-1 3.5z" fill="#fff" />
  </svg>
);

const LANGUAGES = [
  { value: 'english', label: 'English', native: 'English', iconComponent: GlobeIcon },
  { value: 'hindi', label: 'Hindi', native: 'हिंदी', iconComponent: IndiaFlagIcon },
  { value: 'bengali', label: 'Bengali', native: 'বাংলা', iconComponent: LotusIcon }
];

export default function LanguageSelect({ id, name, value, onChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedLang = LANGUAGES.find(l => l.value === (value || 'english')) || LANGUAGES[0];
  const SelectedIcon = selectedLang.iconComponent;

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (langValue) => {
    if (onChange) {
      onChange({
        target: {
          id: id,
          name: name || 'language',
          value: langValue
        }
      });
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full ${className}`}
      style={{ minWidth: '180px' }}
    >
      {/* Hidden select for standard form accessibility and browser testing */}
      <select
        id={id}
        name={name || 'language'}
        value={value || 'english'}
        onChange={onChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      >
        {LANGUAGES.map(l => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>

      {/* Custom dropdown trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between py-2 border-b-[1.5px] border-outline-variant hover:border-primary focus:border-primary bg-transparent text-left font-body-md transition-colors cursor-pointer outline-none focus:outline-none"
        style={{ color: 'var(--color-on-background, #1a1c1b)' }}
      >
        <div className="flex items-center gap-2.5">
          <SelectedIcon />
          <span className="font-medium tracking-wide">
            {selectedLang.native} <span className="opacity-60 text-xs font-normal">({selectedLang.label})</span>
          </span>
        </div>
        <span 
          className="material-symbols-outlined text-primary text-[18px] transition-transform duration-300 ease-out pointer-events-none"
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            fontVariationSettings: "'FILL' 0, 'wght' 300"
          }}
        >
          expand_more
        </span>
      </button>

      {/* Floating premium options list */}
      {isOpen && (
        <ul
          role="listbox"
          aria-activedescendant={`lang-opt-${selectedLang.value}`}
          className="absolute left-0 right-0 mt-1.5 py-1.5 bg-surface/98 backdrop-blur-md border border-outline-variant/60 rounded-xl shadow-lg z-[999] list-none p-0 overflow-hidden select-dropdown-open"
          style={{
            boxShadow: '0 8px 30px rgba(124, 88, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(201, 149, 42, 0.25)'
          }}
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang.value === selectedLang.value;
            const ItemIcon = lang.iconComponent;
            return (
              <li
                key={lang.value}
                id={`lang-opt-${lang.value}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(lang.value)}
                className={`flex items-center justify-between px-4 py-2.5 text-xs font-medium cursor-pointer transition-all duration-150 ${
                  isSelected 
                    ? 'bg-primary/8 text-primary font-bold' 
                    : 'text-on-background/90 hover:bg-primary-container/10 hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ItemIcon />
                  <span className="tracking-wide">
                    {lang.native} <span className={`text-[10px] font-normal ${isSelected ? 'text-primary/70' : 'opacity-50'}`}>({lang.label})</span>
                  </span>
                </div>
                {isSelected && (
                  <span 
                    className="material-symbols-outlined text-primary text-[16px] font-bold"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    done
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
