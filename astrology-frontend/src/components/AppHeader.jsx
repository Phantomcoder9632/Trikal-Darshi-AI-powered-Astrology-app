import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AppHeader — the shared top bar for all public pages (Observatory, Profile).
 *
 * Design: current cream/white palette, refined details:
 *  - Scroll-shrink: h-16 → h-12 after 50px of scroll, with a slightly
 *    stronger blur/shadow when collapsed
 *  - Gold shimmer border: animated left-to-right shimmer on the bottom rule
 *  - Avatar ring glow: thin pulsing gold ring while authenticated
 *
 * variant="landing" renders the "Begin Reading" CTA (scrolls to the form);
 * variant="app" renders just the language control + avatar.
 */
export default function AppHeader({ variant = 'app', onBeginReading, onRequireAuth, children }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // The app scrolls inside #root (body/html have overflow hidden), not the
    // window — so listen in capture phase (catches scroll events from any
    // descendant) and read the container that actually moved.
    const onScroll = () => {
      const y =
        window.scrollY ||
        document.documentElement?.scrollTop ||
        document.body?.scrollTop ||
        document.getElementById('root')?.scrollTop ||
        0;
      setScrolled(y > 50);
    };
    onScroll();
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    // The scroll container is #root — attach directly as well (target phase
    // fires even when document-level capture is unreliable).
    const rootEl = document.getElementById('root');
    rootEl?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      rootEl?.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 bg-[#FFFDF6]/95 backdrop-blur-md border-b border-[#E8DFC9] transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_2px_24px_rgba(217,166,60,0.14)]' : 'shadow-[0_1px_20px_rgba(217,166,60,0.08)]'
      }`}
    >
      <div
        className={`max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 transition-all duration-300 ${
          scrolled ? 'h-12' : 'h-16'
        }`}
      >
        {/* Brand */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 group text-left cursor-pointer bg-transparent border-none p-0"
        >
          <div
            className={`rounded-lg bg-[#1F3A6B] flex items-center justify-center shadow-md border border-[#D9A63C]/40 text-[#F0DFAF] transition-all duration-300 ${
              scrolled ? 'w-7 h-7' : 'w-10 h-10'
            }`}
          >
            <span className={`text-[#D9A63C] leading-none ${scrolled ? 'text-[18px]' : 'text-[24px]'}`}>✦</span>
          </div>
          <div className="flex flex-col">
            <span
              className={`font-['Fraunces',serif] font-bold text-[#022454] tracking-tight leading-none transition-all duration-300 ${
                scrolled ? 'text-[15px]' : 'text-[19px]'
              }`}
            >
              TRIKAL DARSHI
            </span>
            <span
              className={`text-[10px] text-[#7b5800] font-semibold uppercase tracking-widest mt-0.5 transition-opacity duration-300 ${
                scrolled ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              Jyotish Ephemeris · त्रिकाल दर्शी
            </span>
          </div>
        </button>

        {/* Right cluster: page extras (language etc.), CTA, avatar */}
        <div className="flex items-center gap-2.5">
          {children}
          {variant === 'landing' && onBeginReading && (
            <button
              type="button"
              onClick={onBeginReading}
              className="hidden sm:inline-flex items-center gap-2 bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] text-xs font-semibold px-4 py-2 rounded-lg border border-[#D9A63C]/50 transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <span className="text-[#D9A63C] text-[14px]">✦</span>
              <span>Begin Reading</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (isAuthenticated) {
                navigate('/profile');
              } else if (onRequireAuth) {
                onRequireAuth();
              } else {
                window.dispatchEvent(new CustomEvent('trikal:open-auth'));
              }
            }}
            className={`w-9 h-9 rounded-full bg-[#1F3A6B] text-[#F0DFAF] flex items-center justify-center shadow-xs text-xs font-bold hover:scale-105 transition-transform cursor-pointer border ${
              isAuthenticated
                ? 'border-[#D9A63C]/60 ring-1 ring-[#D9A63C]/50 animate-[avatar-glow_2.4s_ease-in-out_infinite]'
                : 'border-[#D9A63C]/40'
            }`}
            title={isAuthenticated ? `Profile: ${user?.name || user?.email}` : 'Sign In / Register Profile'}
          >
            {isAuthenticated && user?.name ? (
              <span>{user.name.slice(0, 2).toUpperCase()}</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">person</span>
            )}
          </button>
        </div>
      </div>

      {/* Gold shimmer bottom rule */}
      <div aria-hidden="true" className="h-px w-full overflow-hidden">
        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#D9A63C]/70 to-transparent animate-[header-shimmer_3.2s_linear_infinite]" />
      </div>
    </header>
  );
}
