import React, { useState, useEffect } from 'react';
import i18n, { backendLangToI18n } from '../i18n';

/* ─── Constants ─────────────────────────────────────────────────── */
const STORAGE_KEY = 'trikal_lang_chosen';

const LANGUAGES = [
  {
    value: 'english',
    label: 'English',
    native: 'English',
    script: 'Latin',
    desc: 'AI readings & UI in English',
    gradient: 'from-[#e0ebf6] to-[#b1cbe8]',
    borderActive: 'border-[#4a6fa5]',
    bgActive: 'bg-[#4a6fa5]/6',
    iconColor: 'text-[#2d4875]',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    value: 'hindi',
    label: 'Hindi',
    native: 'हिंदी',
    script: 'Devanagari',
    desc: 'AI पठन और UI हिंदी में',
    gradient: 'from-[#fef2d6] to-[#fadca0]',
    borderActive: 'border-[#7c5800]',
    bgActive: 'bg-[#7c5800]/6',
    iconColor: 'text-[#7c5800]',
    icon: (
      <svg viewBox="0 0 900 600" className="w-8 h-5.5 rounded-xs shadow-xs" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <rect width="900" height="200" fill="#FF9933" />
        <rect y="200" width="900" height="200" fill="#FFFFFF" />
        <rect y="400" width="900" height="200" fill="#138808" />
        <g transform="translate(450,300)">
          <circle r="92" fill="none" stroke="#000080" strokeWidth="8" />
          <circle r="16" fill="#000080" />
          {Array.from({ length: 24 }).map((_, i) => (
            <line key={i} x1="0" y1="0" x2="0" y2="-92" stroke="#000080" strokeWidth="6" transform={`rotate(${i * 15})`} />
          ))}
        </g>
      </svg>
    ),
  },
  {
    value: 'bengali',
    label: 'Bengali',
    native: 'বাংলা',
    script: 'Bengali',
    desc: 'AI পাঠ এবং UI বাংলায়',
    gradient: 'from-[#fceef5] to-[#f6cae2]',
    borderActive: 'border-[#e066a6]',
    bgActive: 'bg-[#e066a6]/6',
    iconColor: 'text-[#9b3070]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#e066a6]">
        <path d="M12 21a9 9 0 0 1-5-1.5c-1-.7-1.7-1.8-2-3a5.5 5.5 0 0 1 1-4.8 5 5 0 0 1 3.5-1.7c.3 0 .7.1 1 .2a8.6 8.6 0 0 0 1.5-3.2 8.6 8.6 0 0 0 .8-3.5 1 1 0 0 1 1.4-.8 1 1 0 0 1 .6.8c0 1.2.3 2.4.8 3.5a8.6 8.6 0 0 0 1.5 3.2c.3-.1.7-.2 1-.2a5 5 0 0 1 3.5 1.7 5.5 5.5 0 0 1 1 4.8c-.3 1.2-1 2.3-2 3a9 9 0 0 1-5 1.5z" opacity="0.15" />
        <path d="M12 22s-2.5-3-2.5-5.5S11 12 12 12s2.5 2 2.5 4.5S12 22 12 22z" fill="#c9952a" />
        <path d="M12 22c-2 0-5.5-2.5-5.5-5s3-4.5 5.5-5 5.5 2.5 5.5 5-3.5 5-5.5 5z" fill="#e066a6" opacity="0.8" />
        <path d="M12 22c-1.5 0-3.5-1.5-3.5-3.5s2-3.5 3.5-4 3.5 2 3.5 4-2 3.5-3.5 3.5z" fill="#ff9ec7" />
        <path d="M12 22s-1-2-1-3.5 1-2.5 1-2.5 1 1 1 2.5-1 3.5-1 3.5z" fill="#fff" />
      </svg>
    ),
  },
];

/* ─── Hook: returns true only on first-ever visit ────────────────── */
export function useFirstVisit() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const chosen = localStorage.getItem(STORAGE_KEY);
    if (!chosen) setShow(true);
  }, []);
  return [show, () => setShow(false)];
}

/* ─── Main Modal Component (Light Vedic Theme Matched) ────────────── */
export default function LanguageWelcomeModal({ onSelect }) {
  const [selected, setSelected] = useState('english');
  const [confirming, setConfirming] = useState(false);

  // Instantly preview UI language on selection
  function handleSelectLanguage(langValue) {
    setSelected(langValue);
    i18n.changeLanguage(backendLangToI18n(langValue));
  }

  function handleConfirm() {
    setConfirming(true);
    localStorage.setItem(STORAGE_KEY, selected);
    i18n.changeLanguage(backendLangToI18n(selected));
    setTimeout(() => {
      onSelect(selected);
    }, 250);
  }

  const selectedLang = LANGUAGES.find(l => l.value === selected);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-[#1a1c1b]/35 backdrop-blur-[6px]"
        style={{ animation: 'fadeIn 0.25s ease-out' }}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
        role="dialog"
        aria-modal="true"
        aria-label="Language selection"
      >
        <div
          className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: '#FFFDF6',
            border: '1px solid rgba(31, 58, 107, 0.2)',
            boxShadow: '0 10px 40px rgba(14, 26, 55, 0.12), 0 20px 50px rgba(0,0,0,0.15)',
            animation: 'slideUp 0.35s cubic-bezier(0.34, 1.3, 0.64, 1)',
          }}
        >
          {/* Gold theme accent top bar */}
          <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#D9A63C] to-transparent opacity-90" />

          {/* Aesthetic Vedic stars */}
          <div className="absolute top-4 right-6 text-[#D9A63C] opacity-35 text-2xl select-none">✦</div>
          <div className="absolute top-7 right-14 text-[#D9A63C] opacity-20 text-sm select-none">✦</div>
          <div className="absolute top-5 left-6 text-[#D9A63C] opacity-20 text-lg select-none">✦</div>

          <div className="px-6 pt-7 pb-6">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 bg-[#1F3A6B]/8 border border-[#D9A63C]/30">
                <span className="material-symbols-outlined text-[#1F3A6B] text-[24px]">
                  language
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#022454] tracking-wide mb-1 font-['Fraunces',serif] uppercase">
                Choose Language / भाषा चुनें
              </h2>
              <p className="text-[11.5px] text-[#4A567A] font-medium leading-relaxed">
                AI readings & UI will configure in your preferred language.<br />पठन और यूआई आपकी पसंदीदा भाषा में कॉन्फ़िगर होंगे।
              </p>
            </div>

            {/* Language Option Cards Stack */}
            <div className="flex flex-col gap-2.5 mb-6">
              {LANGUAGES.map((lang) => {
                const isActive = selected === lang.value;
                return (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.value)}
                    className={`w-full text-left rounded-xl px-4 py-3 flex items-center gap-3.5 transition-all duration-150 cursor-pointer group relative ${
                      isActive
                        ? 'border-2 border-[#D9A63C] bg-[#FBF5E5]'
                        : 'bg-[#FBF6EA] hover:bg-[#F5EEDD] border border-[#1F3A6B]/15'
                    }`}
                    style={{
                      boxShadow: isActive ? '0 2px 10px rgba(217, 166, 60, 0.15)' : 'none',
                    }}
                    aria-pressed={isActive}
                  >
                    {/* Icon wrapper */}
                    <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${lang.gradient} border border-[#1F3A6B]/15 ${lang.iconColor}`}>
                      {lang.icon}
                    </div>

                    {/* Text block */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[13.5px] font-bold text-[#0E1A37]">{lang.native}</span>
                        <span className="text-[10px] text-[#4A567A] font-semibold">({lang.label})</span>
                      </div>
                      <span className="text-[11px] text-[#4A567A] mt-0.5 block font-medium">{lang.desc}</span>
                    </div>

                    {/* Checkbox indicator */}
                    <div
                      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isActive ? 'border-[#1F3A6B] bg-[#1F3A6B]' : 'border-[#4A567A]/40 bg-transparent'
                      }`}
                    >
                      {isActive && (
                        <span className="material-symbols-outlined text-[#FFFDF6] text-[12px] font-bold">
                          done
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full py-3 rounded-xl font-bold text-[12px] tracking-widest uppercase transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer border border-[#D9A63C] text-[#FFFDF6] bg-[#1F3A6B] hover:bg-[#12244A] active:scale-[0.99] disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              {confirming ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>Configuring…</span>
                </>
              ) : (
                <>
                  <span>Continue / आगे बढ़ें</span>
                  <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">arrow_forward</span>
                </>
              )}
            </button>

            {/* Bottom help text */}
            <p className="text-center text-[10px] text-[#4A567A] mt-2.5 font-medium">
              You can change language anytime from the top bar
            </p>
          </div>

          {/* Bottom decorative gold line */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#D9A63C]/30 to-transparent" />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
