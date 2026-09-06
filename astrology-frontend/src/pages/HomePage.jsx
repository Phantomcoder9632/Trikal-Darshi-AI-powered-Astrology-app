import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateChart, getUserCharts } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { backendLangToI18n } from '../i18n';
import AuthModal from '../components/AuthModal';

// Cosmic Stardust & Twinkling Celestial Canvas matching exact Stitch script
function HeroStarCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const particleCount = 48;
    const colors = [
      'rgba(217, 166, 60, ', // Gold
      'rgba(240, 223, 175, ', // Light Gold
      'rgba(31, 58, 107, ',   // Deep Cosmic Blue
      'rgba(174, 198, 255, '  // Soft Astral Tint
    ];

    function resize() {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    }

    class StarParticle {
      constructor() {
        this.reset(true);
      }
      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : height + 10;
        this.size = Math.random() * 1.8 + 0.6;
        this.baseAlpha = Math.random() * 0.45 + 0.15;
        this.twinkleSpeed = Math.random() * 0.02 + 0.008;
        this.twinklePhase = Math.random() * Math.PI * 2;
        this.vy = -(Math.random() * 0.25 + 0.08);
        this.vx = (Math.random() - 0.5) * 0.1;
        this.colorPrefix = colors[Math.floor(Math.random() * colors.length)];
      }
      update() {
        this.y += this.vy;
        this.x += this.vx;
        this.twinklePhase += this.twinkleSpeed;
        if (this.y < -15 || this.x < -10 || this.x > width + 10) {
          this.reset(false);
        }
      }
      draw() {
        const currentAlpha = Math.max(0, this.baseAlpha + Math.sin(this.twinklePhase) * 0.25);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.colorPrefix + currentAlpha + ')';
        ctx.fill();
      }
    }

    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < particleCount; i++) {
      particles.push(new StarParticle());
    }

    let animationId;
    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none -z-10"
      aria-hidden="true"
    />
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { user, isAuthenticated } = useAuth();
  const { i18n } = useTranslation();

  const [formData, setFormData] = useState(() => {
    const savedLang =
      localStorage.getItem('trikal_lang_chosen') ||
      user?.preferred_language ||
      'english';
    return {
      full_name: 'Anandita Sen',
      date_of_birth: '1994-08-18',
      time_of_birth: '06:42',
      birth_time_confidence: 'exact',
      city_of_birth: 'Varanasi, India',
      current_city: 'Bengaluru, India',
      language: savedLang,
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userCharts, setUserCharts] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  useEffect(() => {
    async function loadCharts() {
      try {
        const data = await getUserCharts();
        setUserCharts(data || []);
      } catch (err) {
        console.error('Failed to load user charts:', err);
      }
    }
    loadCharts();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'language') {
      i18n.changeLanguage(backendLangToI18n(value));
      localStorage.setItem('trikal_lang_chosen', value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.date_of_birth || !formData.time_of_birth || !formData.city_of_birth) {
      setError('Please fill in all required birth parameters marked with *');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await generateChart(formData);
      if (result?.chart_id) {
        navigate(`/dashboard/${result.chart_id}`);
      } else {
        throw new Error('Calculations completed but no Chart ID was returned.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'An error occurred during calculations.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#FBF6EA] font-['Inter',sans-serif] text-[#16223F] antialiased selection:bg-[#F0DFAF] selection:text-[#022454] min-h-screen">
      
      {/* ── AUTH / PROFILE MODAL ── */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />

      {/* ── TOP NAVIGATION BAR ── */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#FFFDF6]/95 backdrop-blur-md border-b border-[#E8DFC9] shadow-xs">
        <div className="h-16 max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 group text-left cursor-pointer bg-transparent border-none p-0"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1F3A6B] flex items-center justify-center shadow-md border border-[#D9A63C]/40 text-[#F0DFAF]">
              <span className="material-symbols-outlined text-[20px]">flare</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-['Fraunces',serif] text-[18px] font-bold text-[#022454] tracking-tight">
                  TRIKAL DARSHI
                </span>
                <span className="text-[#D9A63C] text-[13px]">✦</span>
              </div>
              <span className="text-[10px] text-[#7b5800] font-semibold uppercase tracking-widest mt-0.5">
                Jyotish Ephemeris
              </span>
            </div>
          </button>

          {/* Center Links Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-[#F5EEDC]/60 p-1 rounded-lg border border-[#E8DFC9]">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 rounded bg-[#1F3A6B] text-[#F0DFAF] text-xs font-semibold shadow-xs cursor-pointer"
            >
              Observatory
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/mock-arjun-chart-108')}
              className="px-3.5 py-1.5 rounded text-xs text-[#4A567A] hover:text-[#022454] hover:bg-[#FFFDF6] transition-colors cursor-pointer"
            >
              Soul Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="px-3.5 py-1.5 rounded text-xs text-[#4A567A] hover:text-[#022454] hover:bg-[#FFFDF6] transition-colors cursor-pointer"
            >
              AskAI Guide
            </button>
            <button
              type="button"
              onClick={() => navigate('/charts')}
              className="px-3.5 py-1.5 rounded text-xs text-[#4A567A] hover:text-[#022454] hover:bg-[#FFFDF6] transition-colors cursor-pointer"
            >
              Saved Charts
            </button>
          </nav>

          {/* Right Actions: Language, Sign In / Profile, CTA */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center bg-[#FFFDF6] px-2.5 py-1 rounded-md border border-[#E8DFC9] shadow-xs">
              <span aria-hidden="true" className="text-[13px] mr-1.5">🇮🇳</span>
              <select
                aria-label="Select Language"
                value={formData.language}
                onChange={handleChange}
                name="language"
                className="bg-transparent text-[13px] text-[#16223F] font-medium focus:outline-hidden cursor-pointer pr-1"
              >
                <option value="english">EN (English)</option>
                <option value="hindi">HI (हिन्दी)</option>
                <option value="bengali">BN (বাংলা)</option>
              </select>
            </div>

            {/* Sign In / Register Trigger */}
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#FFFDF6] hover:bg-[#F4EEDA] text-[#1F3A6B] text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#D9A63C]/40 transition-all cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">login</span>
                <span>Sign In / Profile</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="hidden sm:inline-flex items-center gap-2 bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] text-xs font-semibold px-4 py-2 rounded-lg border border-[#D9A63C]/50 transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <span className="text-[#D9A63C] text-[14px]">✦</span>
              <span>Begin Reading</span>
            </button>

            {/* Profile Avatar Button */}
            <button
              type="button"
              onClick={() => {
                setAuthModalMode(isAuthenticated ? 'profile' : 'login');
                setShowAuthModal(true);
              }}
              className="w-9 h-9 rounded-full bg-[#1F3A6B] text-[#F0DFAF] flex items-center justify-center border border-[#D9A63C]/40 shadow-xs cursor-pointer text-xs font-bold hover:scale-105 transition-transform"
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
      </header>

      {/* â”€â”€ MAIN CONTENT â”€â”€ */}
      <main className="w-full pt-16 min-h-screen">
        
        {/* Starfield SVG Pattern Ground */}
        <div className="relative w-full overflow-hidden bg-[#FBF6EA]">
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0 opacity-40">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="astral-grid" width="96" height="96" patternUnits="userSpaceOnUse">
                  <circle cx="12" cy="18" r="1.2" fill="#D9A63C" />
                  <circle cx="68" cy="44" r="0.9" fill="#D9A63C" />
                  <circle cx="48" cy="82" r="1.4" fill="#D9A63C" />
                  <circle cx="86" cy="12" r="0.75" fill="#D9A63C" />
                  <circle cx="32" cy="58" r="0.8" fill="#D9A63C" />
                  <path d="M12 18 L16 18 M12 14 L12 22" stroke="#D9A63C" strokeWidth="0.5" opacity="0.35" />
                  <path d="M48 82 L52 82 M48 78 L48 86" stroke="#D9A63C" strokeWidth="0.5" opacity="0.35" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#astral-grid)" />
            </svg>
          </div>

          {/* â”€â”€ SECTION 1: HERO CONTAINER WITH CELESTIAL ASTROLABE â”€â”€ */}
          <section className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16 pt-8 pb-16 lg:pt-12 lg:pb-20">
            {/* Dynamic Animated Atmospheric Canvas & Astrolabe Layer */}
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden -z-10 select-none">
              <HeroStarCanvas />
              <div className="absolute -top-16 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-[#D9A63C]/35 via-[#F0DFAF]/30 to-transparent rounded-full blur-3xl animate-cosmic-pulse" />
              <div
                className="absolute top-20 right-8 w-[580px] h-[580px] bg-gradient-to-tl from-[#1F3A6B]/25 via-[#aec6ff]/35 to-transparent rounded-full blur-3xl animate-cosmic-pulse"
                style={{ animationDelay: '-4.5s' }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] lg:w-[940px] lg:h-[940px] pointer-events-none select-none">
                <svg
                  className="w-full h-full animate-astrolabe-reverse drop-shadow-md"
                  fill="none"
                  viewBox="0 0 900 900"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="450" cy="450" opacity="0.85" r="420" stroke="#D9A63C" strokeDasharray="3 8" strokeWidth="1.5" />
                  <circle cx="450" cy="450" opacity="0.6" r="395" stroke="#1F3A6B" strokeWidth="1" />
                  <circle cx="450" cy="450" opacity="0.75" r="370" stroke="#D9A63C" strokeDasharray="6 6" strokeWidth="1.2" />
                  <line opacity="0.65" stroke="#D9A63C" strokeDasharray="4 8" strokeWidth="1" x1="30" x2="870" y1="450" y2="450" />
                  <line opacity="0.65" stroke="#D9A63C" strokeDasharray="4 8" strokeWidth="1" x1="450" x2="450" y1="30" y2="870" />
                  <line opacity="0.5" stroke="#1F3A6B" strokeDasharray="3 7" strokeWidth="0.9" x1="153" x2="747" y1="153" y2="747" />
                  <line opacity="0.5" stroke="#1F3A6B" strokeDasharray="3 7" strokeWidth="0.9" x1="747" x2="153" y1="153" y2="747" />
                  <circle cx="450" cy="30" fill="#D9A63C" r="5" />
                  <circle cx="450" cy="870" fill="#D9A63C" r="5" />
                  <circle cx="30" cy="450" fill="#1F3A6B" r="5" />
                  <circle cx="870" cy="450" fill="#1F3A6B" r="5" />
                  <circle cx="153" cy="153" fill="#D9A63C" opacity="0.8" r="4" />
                  <circle cx="747" cy="153" fill="#1F3A6B" opacity="0.8" r="4" />
                  <circle cx="153" cy="747" fill="#1F3A6B" opacity="0.8" r="4" />
                  <circle cx="747" cy="747" fill="#D9A63C" opacity="0.8" r="4" />
                  <text fill="#7B5800" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.2em" opacity="0.85" textAnchor="middle" x="450" y="58">
                    0Â° ARIES â€¢ MESHA â™ˆ
                  </text>
                  <text fill="#7B5800" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.2em" opacity="0.85" textAnchor="middle" x="450" y="852">
                    180Â° LIBRA â€¢ TULA â™Ž
                  </text>
                  <text fill="#022454" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.2em" opacity="0.85" textAnchor="middle" transform="rotate(-90 58 450)" x="58" y="450">
                    270Â° CAPRICORN â€¢ MAKARA â™‘
                  </text>
                  <text fill="#022454" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.2em" opacity="0.85" textAnchor="middle" transform="rotate(90 842 450)" x="842" y="450">
                    90Â° CANCER â€¢ KARKA â™‹
                  </text>
                </svg>
                <svg
                  className="absolute inset-0 w-full h-full animate-astrolabe-slow drop-shadow-lg"
                  fill="none"
                  viewBox="0 0 900 900"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="450" cy="450" opacity="0.85" r="310" stroke="#D9A63C" strokeWidth="1.8" />
                  <circle cx="450" cy="450" opacity="0.65" r="260" stroke="#1F3A6B" strokeDasharray="6 8" strokeWidth="1.2" />
                  <circle cx="450" cy="450" opacity="0.75" r="180" stroke="#D9A63C" strokeDasharray="3 5" strokeWidth="1" />
                  <polygon opacity="0.65" points="450,140 718,605 182,605" stroke="#D9A63C" strokeWidth="1.4" />
                  <polygon opacity="0.55" points="450,760 182,295 718,295" stroke="#1F3A6B" strokeWidth="1.4" />
                  <polygon opacity="0.5" points="450,220 649,565 251,565" stroke="#D9A63C" strokeDasharray="4 4" strokeWidth="1" />
                  <polygon opacity="0.45" points="450,680 251,335 649,335" stroke="#1F3A6B" strokeDasharray="4 4" strokeWidth="1" />
                  <circle cx="450" cy="450" fill="#FAF8FF" opacity="0.9" r="50" stroke="#D9A63C" strokeWidth="1.5" />
                  <circle cx="450" cy="450" fill="#D9A63C" r="8" />
                  <circle cx="450" cy="450" fill="none" opacity="0.8" r="18" stroke="#1F3A6B" strokeDasharray="3 3" strokeWidth="1" />
                  <g transform="translate(760, 450)">
                    <circle fill="#D9A63C" r="7" />
                    <circle fill="none" opacity="0.75" r="14" stroke="#D9A63C" strokeDasharray="2 3" strokeWidth="1" />
                    <circle fill="none" opacity="0.4" r="22" stroke="#1F3A6B" strokeWidth="0.8" />
                  </g>
                  <g transform="translate(140, 450)">
                    <circle fill="#1F3A6B" r="6" />
                    <circle fill="none" opacity="0.7" r="12" stroke="#1F3A6B" strokeDasharray="2 3" strokeWidth="1" />
                  </g>
                  <g transform="translate(450, 140)">
                    <circle fill="#D9A63C" r="6.5" />
                    <circle fill="none" opacity="0.65" r="13" stroke="#D9A63C" strokeWidth="1" />
                  </g>
                  <g transform="translate(450, 760)">
                    <circle fill="#1F3A6B" r="5.5" />
                    <circle fill="none" opacity="0.6" r="11" stroke="#1F3A6B" strokeWidth="1" />
                  </g>
                  <g transform="translate(634, 266)">
                    <circle fill="#BA1A1A" opacity="0.85" r="4.5" />
                    <circle fill="none" opacity="0.6" r="9" stroke="#BA1A1A" strokeDasharray="2 2" strokeWidth="0.8" />
                  </g>
                  <g transform="translate(266, 634)">
                    <circle fill="#7B5800" opacity="0.85" r="5" />
                    <circle fill="none" opacity="0.6" r="10" stroke="#7B5800" strokeWidth="0.8" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Editorial Masthead Overline Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 mb-8 rounded-lg bg-[#FFFDF6]/90 backdrop-blur-sm border border-[#E8DFC9] shadow-xs">
              <div className="flex items-center gap-2 text-[#4A567A]">
                <span className="material-symbols-outlined text-[18px] text-[#D9A63C]">explore</span>
                <span className="text-[12px] uppercase tracking-widest text-[#022454] font-bold">Kala-Chakra Observatory</span>
                <span className="text-[#D9A63C]">âœ¦</span>
                <span className="text-[12px] text-[#4A567A]">Sidereal Lahiri Ephemeris</span>
              </div>
              <div className="flex items-center gap-3 text-[12px]">
                <span className="text-[#4A567A]">Ayanamsa: <strong className="text-[#16223F]">24Â° 11' 42"</strong></span>
                <span className="text-[#D9A63C]">âœ¦</span>
                <span className="text-[#022454] font-semibold">Bá¹›hat ParÄÅ›ara HorÄÅ›Ästra Standard</span>
              </div>
            </div>

            {/* 2-Column Hero Architecture */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              
              {/* LEFT HERO COLUMN */}
              <div className="lg:col-span-7 flex flex-col gap-6 lg:gap-8">
                {/* Brand Pre-badge */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2 self-start">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FBF5E5] border-2 border-[#D9A63C]/60 text-[#7b5800] shadow-md">
                      <span className="font-['Fraunces',serif] text-sm font-bold text-[#022454] tracking-tight">TRIKAL DARSHI</span>
                      <span className="text-[#D9A63C] text-[13px]">âœ¦</span>
                      <span className="text-[11px] font-semibold tracking-wider uppercase">à¤¤à¥à¤°à¤¿à¤•à¤¾à¤² à¤¦à¤°à¥à¤¶à¥€</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFDF6]/95 border border-[#D9A63C]/40 text-[#022454] shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[#D9A63C] animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7b5800]">âœ¦ Kala-Chakra Engine â€¢ Sidereal 0.02Â° Precision</span>
                    </div>
                  </div>

                  <h1 className="font-['Fraunces',serif] text-4xl sm:text-5xl lg:text-[54px] font-semibold leading-[1.12] text-[#0E1A37] tracking-tight pt-1">
                    The Geometry of <br />
                    <span className="italic font-['Fraunces',serif] font-bold gold-shimmer-text decoration-[#D9A63C] decoration-2 underline underline-offset-8 drop-shadow-sm">
                      Soul &amp; Time.
                    </span>
                  </h1>

                  <p className="text-base sm:text-lg text-[#4A567A] leading-relaxed max-w-2xl pt-1">
                    Mathematical Vedic delineations anchored in immutable celestial coordinates. Unveiling sixteen levels of karmic projection through razor-sharp planetary mechanics.
                  </p>
                </div>

                {/* Feature Pills With Distinct Tints & Icons */}
                <div className="flex flex-wrap gap-2.5">
                  <div className="hero-pill-hover bg-[#FFFDF6]/90 backdrop-blur-xs border border-[#E5DEC7] px-3.5 py-2 rounded-lg shadow-xs flex items-center gap-2 cursor-default">
                    <span className="w-2 h-2 rounded-full bg-[#D9A63C]" />
                    <span className="text-[13px] font-semibold text-[#16223F]">Divisional Charts</span>
                  </div>
                  <div className="hero-pill-hover bg-[#FFFDF6]/90 backdrop-blur-xs border border-[#E5DEC7] px-3.5 py-2 rounded-lg shadow-xs flex items-center gap-2 cursor-default">
                    <span className="w-2 h-2 rounded-full bg-[#1F3A6B]" />
                    <span className="text-[13px] font-semibold text-[#16223F]">AI Streaming</span>
                  </div>
                  <div className="hero-pill-hover bg-[#FFFDF6]/90 backdrop-blur-xs border border-[#E5DEC7] px-3.5 py-2 rounded-lg shadow-xs flex items-center gap-2 cursor-default">
                    <span className="w-2 h-2 rounded-full bg-[#D9A63C]" />
                    <span className="text-[13px] font-semibold text-[#16223F]">Remedy Tripath</span>
                  </div>
                  <div className="hero-pill-hover bg-[#FFFDF6]/90 backdrop-blur-xs border border-[#E5DEC7] px-3.5 py-2 rounded-lg shadow-xs flex items-center gap-2 cursor-default">
                    <span className="w-2 h-2 rounded-full bg-[#1F3A6B]" />
                    <span className="text-[13px] font-semibold text-[#16223F]">10+ Life Sections</span>
                  </div>
                </div>

                {/* 4 Distinct Numerical Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
                  <div className="hero-stat-card bg-gradient-to-b from-[#FFFDF6] to-[#FAF5E6] p-4 rounded-xl border-2 border-[#E0CF9B] hover:border-[#D9A63C] shadow-md flex flex-col">
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-['Fraunces',serif] text-3xl font-bold text-[#022454]">16+</span>
                      <div className="w-8 h-8 rounded-lg bg-[#FBF5E5] flex items-center justify-center border border-[#D9A63C]/40 shadow-xs">
                        <span className="material-symbols-outlined text-[19px] text-[#D9A63C]">grid_view</span>
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-[#16223F] mt-1">Divisional Charts</span>
                    <span className="text-[11px] text-[#7b5800] font-semibold mt-0.5">Shodashvarga</span>
                  </div>

                  <div className="hero-stat-card bg-gradient-to-b from-[#FFFDF6] to-[#FAF5E6] p-4 rounded-xl border-2 border-[#E0CF9B] hover:border-[#D9A63C] shadow-md flex flex-col">
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-['Fraunces',serif] text-3xl font-bold text-[#022454]">10</span>
                      <div className="w-8 h-8 rounded-lg bg-[#FBF5E5] flex items-center justify-center border border-[#D9A63C]/40 shadow-xs">
                        <span className="material-symbols-outlined text-[19px] text-[#D9A63C]">timeline</span>
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-[#16223F] mt-1">Life Sections</span>
                    <span className="text-[11px] text-[#7b5800] font-semibold mt-0.5">Dasha &amp; Gochara</span>
                  </div>

                  <div className="hero-stat-card bg-gradient-to-b from-[#FFFDF6] to-[#FAF5E6] p-4 rounded-xl border-2 border-[#E0CF9B] hover:border-[#D9A63C] shadow-md flex flex-col">
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-['Fraunces',serif] text-3xl font-bold text-[#022454]">3</span>
                      <div className="w-8 h-8 rounded-lg bg-[#FBF5E5] flex items-center justify-center border border-[#D9A63C]/40 shadow-xs">
                        <span className="material-symbols-outlined text-[19px] text-[#D9A63C]">menu_book</span>
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-[#16223F] mt-1">Wisdom Streams</span>
                    <span className="text-[11px] text-[#7b5800] font-semibold mt-0.5">Parashari, Jaimini, KP</span>
                  </div>

                  <div className="hero-stat-card bg-gradient-to-b from-[#FFFDF6] to-[#FAF5E6] p-4 rounded-xl border-2 border-[#E0CF9B] hover:border-[#D9A63C] shadow-md flex flex-col">
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-['Fraunces',serif] text-3xl font-bold text-[#022454]">âˆž</span>
                      <div className="w-8 h-8 rounded-lg bg-[#FBF5E5] flex items-center justify-center border border-[#D9A63C]/40 shadow-xs">
                        <span className="material-symbols-outlined text-[19px] text-[#D9A63C]">cyclone</span>
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-[#16223F] mt-1">Cosmic Insights</span>
                    <span className="text-[11px] text-[#7b5800] font-semibold mt-0.5">Real-Time Transit</span>
                  </div>
                </div>

                {/* Primary Action Triggers */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] border-2 border-[#D9A63C] px-7 py-3 text-base font-semibold rounded-lg shadow-md hover:shadow-xl transition-all flex items-center gap-2 group cursor-pointer"
                  >
                    <span>Begin Reading</span>
                    <span className="text-[#D9A63C] text-[16px] group-hover:rotate-45 transition-transform">âœ¦</span>
                  </button>

                  <a
                    href="#matrix-showcase"
                    className="bg-[#FFFDF6] hover:bg-[#FBF5E5] text-[#1F3A6B] px-6 py-3 text-base font-semibold rounded-lg border border-[#E8DFC9] shadow-xs transition-colors"
                  >
                    See Features
                  </a>

                  <button
                    type="button"
                    onClick={() => navigate('/chat')}
                    className="text-[#7b5800] hover:text-[#022454] text-base font-bold flex items-center gap-1 px-3 py-2 transition-colors cursor-pointer bg-transparent border-none"
                  >
                    <span>AI Astrologer</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>

                {/* Scholarly Precision Vignettes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-[#FFFDF6]/95 backdrop-blur-sm p-4 rounded-xl border border-[#E8DFC9] shadow-xs flex items-center gap-3.5 hover:border-[#D9A63C]/60 transition-colors">
                    <img
                      className="w-16 h-16 object-cover rounded-lg border border-[#E0CF9B] shadow-inner flex-shrink-0"
                      alt="Astrolabe instrument"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsTPjbxC2jaxDd7MDTA-gjZcHjv9xJGmI4jSgRiDborVO9mPaF5hXueNQx7Vl-V2FhOSzJaBCwaSo9_ZFPD8oaEWVahqIhX50uNwcHtXGlpjGI7jVJPg0vUphXTw5kWdC3HTWPddC5KRsrjFmbv_S311WfjHnqxYRZxkBkxM2waV2MAlwE6XyGF4qyQ5euw1ZzaHz-mG0MfpU0EGM7epg0izqedjl6yRteWKXSWnzlLVIxaUKt41CM"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-[#16223F] font-bold">Astronomical Rigor</span>
                      <p className="text-xs text-[#4A567A] line-clamp-2 mt-0.5">
                        NASA JPL Swiss Ephemeris micro-precision synchronized to fractional planetary seconds.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#FFFDF6]/95 backdrop-blur-sm p-4 rounded-xl border border-[#E8DFC9] shadow-xs flex items-center gap-3.5 hover:border-[#D9A63C]/60 transition-colors">
                    <img
                      className="w-16 h-16 object-cover rounded-lg border border-[#E0CF9B] shadow-inner flex-shrink-0"
                      alt="Sanskrit horoscope parchment"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9tszpsjCgTvARsv0tmoCVv6PBTKhP-N10Y9TSDyfSERJkvcidv0PMmb2yvrsQV3sLJ8lFDdmIjXD45aR0go8Tv1J2EwYVsVDqK6MQIwmXSiWvXFgTDR4D_6OMRMqHLWUaVD929ujdilEiLjK3lD1NUZo3grK3OESTYn94TQxXr7TzYBeYslKF-cpJLffdunvcr6j_AatYumY0N1o121WyuFepFNTWi8QLazMKxJWwgrkVDh2ConyK"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-[#16223F] font-bold">Vimshottari Dasha</span>
                      <p className="text-xs text-[#4A567A] line-clamp-2 mt-0.5">
                        120-year multi-tier planetary periods traced through Antardasha and Pratyantardasha.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Saved Astrological Profiles Shelf */}
                {userCharts && userCharts.length > 0 && (
                  <div className="p-4 bg-[#FFFDF6] border border-[#E8DFC9] rounded-xl shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#022454] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">folder_shared</span>
                        <span>Your Saved Astrological Profiles</span>
                      </span>
                      <span className="text-[11px] text-[#4A567A] font-semibold">{userCharts.length} Charts</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {userCharts.map((chart) => (
                        <button
                          key={chart.chart_id}
                          type="button"
                          onClick={() => navigate(`/dashboard/${chart.chart_id}`)}
                          className="p-2.5 text-left bg-[#FBF6EA] hover:bg-[#FAF5E6] border border-[#E8D5A7] hover:border-[#D9A63C] rounded-lg transition-all flex flex-col gap-0.5 cursor-pointer shadow-2xs"
                        >
                          <span className="font-semibold text-xs text-[#0E1A37] truncate">{chart.full_name}</span>
                          <span className="text-[10px] text-[#4A567A]">
                            {chart.ascendant_sign || 'Libra'} Asc Â· {chart.date_of_birth}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT HERO COLUMN: Janma Kundali Generator Form Card */}
              <div className="lg:col-span-5 lg:sticky lg:top-24" id="birth-form-card" ref={formRef}>
                <div className="hero-card-glow bg-[#FFFDF6]/95 backdrop-blur-md p-6 sm:p-8 rounded-2xl border-2 border-[#E5DEC7] relative border-[#D9A63C]/50 shadow-md">
                  
                  {/* Corner Decorative Accents */}
                  <div
                    aria-hidden="true"
                    className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#FBF5E5] border border-[#E0CF9B] text-[#7b5800] font-mono text-[11px] font-bold"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9A63C]" />
                    <span>COORD â€¢ J108</span>
                  </div>

                  {/* Form Header */}
                  <div className="flex flex-col gap-1.5 pb-6 border-b border-[#EAE3D2]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#D9A63C]">auto_awesome</span>
                      <span className="text-[12px] uppercase tracking-widest text-[#7b5800] font-bold">
                        Janma Kundali Generator
                      </span>
                    </div>
                    <h2 className="font-['Fraunces',serif] text-2xl font-bold text-[#022454] tracking-tight">
                      Cast Celestial Chart
                    </h2>
                    <p className="text-[13px] text-[#4A567A] leading-relaxed">
                      Enter birth coordinates to compute exact ascendant degrees, nakshatra pada, and planetary vargas.
                    </p>

                    {/* Vault Sync / Profile Creation Indicator */}
                    <div className="mt-2 p-2.5 bg-[#FBF6EA] border border-[#D9A63C]/30 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#D9A63C] animate-pulse"></span>
                        <span className="text-[#16223F] font-medium">
                          {isAuthenticated ? (
                            <span>Active: <strong>{user?.name || user?.email}</strong></span>
                          ) : (
                            <span>Auto-save to Vault</span>
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode(isAuthenticated ? 'profile' : 'register');
                          setShowAuthModal(true);
                        }}
                        className="text-[#7b5800] hover:text-[#022454] font-bold text-xs underline cursor-pointer bg-transparent border-none p-0"
                      >
                        {isAuthenticated ? 'Manage Profile →' : 'Sign In / Register →'}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="my-3 p-3 bg-[#FFDAD6] border border-[#BA1A1A]/30 text-[#93000A] text-xs rounded-lg flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-6">
                    {/* Full Name */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-[#16223F] font-semibold" htmlFor="full_name">
                          Full Name
                        </label>
                        <span className="text-[11px] text-[#7b5800] font-medium uppercase tracking-wider">Mandatory</span>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          id="full_name"
                          name="full_name"
                          type="text"
                          required
                          value={formData.full_name}
                          onChange={handleChange}
                          placeholder="e.g. Anandita Sen"
                          className="w-full h-11 px-3.5 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] placeholder-[#4A567A]/60 text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                        />
                        <span className="material-symbols-outlined absolute right-3 text-[20px] text-[#4A567A] pointer-events-none">
                          badge
                        </span>
                      </div>
                    </div>

                    {/* Date & Time Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-[#16223F] font-semibold" htmlFor="date_of_birth">
                          Date of Birth
                        </label>
                        <input
                          id="date_of_birth"
                          name="date_of_birth"
                          type="date"
                          required
                          value={formData.date_of_birth}
                          onChange={handleChange}
                          className="w-full h-11 px-3.5 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-[#16223F] font-semibold" htmlFor="time_of_birth">
                          Time of Birth
                        </label>
                        <input
                          id="time_of_birth"
                          name="time_of_birth"
                          type="time"
                          required
                          step="60"
                          value={formData.time_of_birth}
                          onChange={handleChange}
                          className="w-full h-11 px-3.5 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                        />
                      </div>
                    </div>

                    {/* Birth Time Confidence */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm text-[#16223F] font-semibold">Birth Time Confidence</span>
                      <div className="grid grid-cols-3 gap-1.5 bg-[#E8EEF8]/60 p-1.5 rounded-lg border border-[#D8E1F0]">
                        {['exact', 'approximate', 'unknown'].map((conf) => (
                          <button
                            key={conf}
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, birth_time_confidence: conf }))}
                            className={`py-2 text-center text-xs font-semibold rounded-md capitalize transition-all cursor-pointer ${
                              formData.birth_time_confidence === conf
                                ? 'bg-[#1F3A6B] text-[#F0DFAF] font-bold shadow-xs'
                                : 'text-[#4A567A] hover:text-[#16223F]'
                            }`}
                          >
                            {conf}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-[#4A567A] mt-0.5">
                        For exact ascendant degrees (Â±2 deg), accurate birth minutes provide higher D9 resolution.
                      </p>
                    </div>

                    {/* Place of Birth */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-[#16223F] font-semibold" htmlFor="city_of_birth">
                        Place of Birth
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="city_of_birth"
                          name="city_of_birth"
                          type="text"
                          required
                          value={formData.city_of_birth}
                          onChange={handleChange}
                          placeholder="Varanasi, India"
                          className="w-full h-11 pl-3.5 pr-10 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] placeholder-[#4A567A]/60 text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                        />
                        <span className="material-symbols-outlined absolute right-3 text-[20px] text-[#D9A63C] pointer-events-none">
                          location_on
                        </span>
                      </div>
                      <span className="text-[11px] text-[#4A567A]">Geo-coordinates: Lat 25.3176Â° N, Long 82.9739Â° E</span>
                    </div>

                    {/* Current City */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-[#16223F] font-semibold" htmlFor="current_city">
                        Current City (for Gochara Transits)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="current_city"
                          name="current_city"
                          type="text"
                          value={formData.current_city}
                          onChange={handleChange}
                          placeholder="Bengaluru, India"
                          className="w-full h-11 pl-3.5 pr-10 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] placeholder-[#4A567A]/60 text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                        />
                        <span className="material-symbols-outlined absolute right-3 text-[20px] text-[#4A567A] pointer-events-none">
                          my_location
                        </span>
                      </div>
                    </div>

                    {/* Interpretation Language */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-[#16223F] font-semibold" htmlFor="language-select">
                        Interpretation Language
                      </label>
                      <div className="relative flex items-center">
                        <select
                          id="language-select"
                          name="language"
                          value={formData.language}
                          onChange={handleChange}
                          className="w-full h-11 px-3.5 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors appearance-none cursor-pointer"
                        >
                          <option value="english">English (IAST Romanized Diacritics)</option>
                          <option value="hindi">à¤¹à¤¿à¤¨à¥à¤¦à¥€ (Devanagari Sanskritised)</option>
                          <option value="bengali">à¦¬à¦¾à¦‚à¦²à¦¾ (Bengali Traditional Shloka)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 text-[20px] text-[#4A567A] pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </div>

                    {/* Privacy Checkbox */}
                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        defaultChecked
                        id="privacy-check"
                        type="checkbox"
                        className="mt-0.5 rounded border-[#C4BFA8] text-[#022454] focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="privacy-check" className="text-xs text-[#4A567A] leading-snug cursor-pointer">
                        Secure computation. Ephemeris calculations are processed privately without advertising profile tracking.
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] border-2 border-[#D9A63C] text-base font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                          <span>Computing Precision Sidereal Chartâ€¦</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px] text-[#D9A63C]">auto_awesome</span>
                          <span>Begin Reading</span>
                        </>
                      )}
                    </button>

                    {/* Guarantee Badges */}
                    <div className="flex items-center justify-center gap-6 pt-2 text-[#4A567A]">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[17px] text-[#D9A63C]">verified</span>
                        <span className="text-xs font-medium">D1 to D60 Varga</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[17px] text-[#D9A63C]">schedule</span>
                        <span className="text-xs font-medium">Instant Calculation</span>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

            </div>
          </section>

          {/* â”€â”€ SECTION 2: THE THREE CELESTIAL STREAMS (Exact 3-Column Section) â”€â”€ */}
          <section className="relative z-10 border-t border-[#E8DFC9] bg-gradient-to-b from-[#FAF5E6] to-[#F5EEDC]/80 py-16 lg:py-20">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBF5E5] border border-[#E0CF9B] text-[#7b5800] text-xs font-bold uppercase tracking-widest mb-3">
                  <span className="text-[#D9A63C]">âœ¦</span> Integrated Jyotish Canon <span className="text-[#D9A63C]">âœ¦</span>
                </div>
                <h2 className="font-['Fraunces',serif] text-3xl sm:text-4xl font-bold text-[#022454] tracking-tight">
                  The Three Celestial Streams
                </h2>
                <p className="text-base text-[#4A567A] mt-3">
                  Synthesizing authoritative classical traditions into one unified computational engine without shortcuts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {/* Stream 1: Parashari Vargas */}
                <div className="bg-[#FFFDF6] p-6 sm:p-7 rounded-2xl border-2 border-[#E5DEC7] hover:border-[#D9A63C] shadow-md flex flex-col justify-between transition-all group">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[#1F3A6B] text-[#F0DFAF] flex items-center justify-center border border-[#D9A63C]/40 shadow-sm mb-5 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[24px]">account_tree</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#7b5800]">
                        Stream I â€¢ Classical Foundation
                      </span>
                    </div>
                    <h3 className="font-['Fraunces',serif] text-xl font-bold text-[#022454] mb-3">
                      Parashari Vargas &amp; Dasha
                    </h3>
                    <p className="text-sm text-[#4A567A] leading-relaxed mb-6">
                      Complete 16 divisional charts (Shodashvarga) computed from D1 Rashi through D60 Shashtiamsha. Multi-tier Vimshottari mahadashas with exact sandhi transitions.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-[#EAE3D2] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#16223F]">16 Vargas â€¢ Vimshottari</span>
                    <span className="text-[#D9A63C] text-sm font-bold">âœ¦ Standard</span>
                  </div>
                </div>

                {/* Stream 2: Lal Kitab Farmaan */}
                <div className="bg-[#FFFDF6] p-6 sm:p-7 rounded-2xl border-2 border-[#D9A63C]/50 hover:border-[#D9A63C] shadow-md flex flex-col justify-between transition-all group bg-gradient-to-b from-[#FFFDF6] to-[#FFF9ED]">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[#7b5800] text-[#F0DFAF] flex items-center justify-center border border-[#D9A63C] shadow-sm mb-5 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[24px]">balance</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#7b5800]">
                        Stream II â€¢ Remedial Hermeneutics
                      </span>
                    </div>
                    <h3 className="font-['Fraunces',serif] text-xl font-bold text-[#022454] mb-3">
                      Lal Kitab &amp; Farmaan
                    </h3>
                    <p className="text-sm text-[#4A567A] leading-relaxed mb-6">
                      Pragmatic planetary debts (Rin) analysis and non-ritualistic, practical environmental adjustments. Diagnostic insight into dormant houses and blind planetary aspects.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-[#EAE3D2] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#16223F]">Rin Analysis â€¢ Practical Upay</span>
                    <span className="text-[#7b5800] font-bold text-xs bg-[#F0DFAF]/60 px-2 py-0.5 rounded">Remedy Engine</span>
                  </div>
                </div>

                {/* Stream 3: Vedic Numerology & KP System */}
                <div className="bg-[#FFFDF6] p-6 sm:p-7 rounded-2xl border-2 border-[#E5DEC7] hover:border-[#D9A63C] shadow-md flex flex-col justify-between transition-all group">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[#1F3A6B] text-[#F0DFAF] flex items-center justify-center border border-[#D9A63C]/40 shadow-sm mb-5 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[24px]">pin</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#7b5800]">
                        Stream III â€¢ Micro-Sublords
                      </span>
                    </div>
                    <h3 className="font-['Fraunces',serif] text-xl font-bold text-[#022454] mb-3">
                      KP Stellar &amp; Numerology
                    </h3>
                    <p className="text-sm text-[#4A567A] leading-relaxed mb-6">
                      Placidus cuspal divisions married with Krishnamurti Paddhati sub-lord filters. Ank Jyotish concordance linking psychic numbers with resonant planetary vibratory rates.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-[#EAE3D2] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#16223F]">Sub-Lord Filters â€¢ Placidus</span>
                    <span className="text-[#D9A63C] text-sm font-bold">âœ¦ Precision</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* â”€â”€ SECTION 3: KUNDLI D1 MATRIX & EPHEMERIS SHOWCASE (2-Column) â”€â”€ */}
          <section className="relative z-10 py-16 lg:py-20 border-t border-[#E8DFC9] bg-[#FBF6EA]" id="matrix-showcase">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                
                {/* Left Sub-column: Interactive Signature Yantra Kundali Graphic */}
                <div className="lg:col-span-6">
                  <div className="bg-[#FFFDF6] p-6 sm:p-8 rounded-2xl border-2 border-[#E5DEC7] shadow-lg relative">
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EAE3D2]">
                      <div className="flex flex-col">
                        <span className="font-['Fraunces',serif] text-xl font-bold text-[#022454]">Janma Lagna D1 Matrix</span>
                        <span className="text-xs text-[#4A567A]">Kendra (Angular) â€¢ Trikona (Trinal) Coordinate Axis</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 bg-[#F0DFAF] text-[#16223F] text-xs rounded-md font-semibold border border-[#D9A63C]/40">Sidereal Lahiri</span>
                        <span className="px-2.5 py-1 bg-[#E8EEF8] text-[#022454] text-xs rounded-md font-semibold border border-[#CBD9EE]">True Chitra Node</span>
                      </div>
                    </div>

                    {/* Yantra Kundali Canvas (North Indian Style) */}
                    <div className="relative w-full aspect-square max-w-[420px] mx-auto bg-[#FAF8FF] rounded-xl border border-[#D5CDBC] p-2 shadow-inner">
                      <svg className="w-full h-full drop-shadow-xs select-none" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="10" width="380" height="380" fill="none" stroke="#1F3A6B" strokeWidth="1.8" />
                        <circle cx="200" cy="200" r="130" fill="none" opacity="0.4" stroke="#D9A63C" strokeDasharray="3 3" strokeWidth="1" />
                        <circle cx="200" cy="200" r="170" fill="none" opacity="0.25" stroke="#1F3A6B" strokeWidth="0.75" />
                        <line x1="10" y1="10" x2="390" y2="390" opacity="0.85" stroke="#1F3A6B" strokeWidth="1.2" />
                        <line x1="390" y1="10" x2="10" y2="390" opacity="0.85" stroke="#1F3A6B" strokeWidth="1.2" />
                        <polygon points="200,10 390,200 200,390 10,200" fill="none" stroke="#1F3A6B" strokeWidth="1.5" />
                        <polygon points="200,10 295,105 200,200 105,105" fill="#F0DFAF" fillOpacity="0.35" />
                        <polygon points="10,200 105,105 200,200 105,295" fill="#F0DFAF" fillOpacity="0.2" />
                        <polygon points="200,200 295,295 200,390 105,295" fill="#F0DFAF" fillOpacity="0.3" />
                        <polygon points="200,200 295,105 390,200 295,295" fill="#F0DFAF" fillOpacity="0.2" />
                        
                        <text x="200" y="42" fill="#7B5800" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" textAnchor="middle">I â€¢ LAGNA</text>
                        <text x="200" y="88" fill="#022454" fontFamily="Fraunces, serif" fontSize="16" fontWeight="700" textAnchor="middle">Mesha (Ar 14Â°)</text>
                        <text x="200" y="110" fill="#1F3A6B" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" textAnchor="middle">Ju â™ƒ (Guru) [Exalted]</text>
                        <text x="200" y="128" fill="#4A567A" fontFamily="Inter, sans-serif" fontSize="9" textAnchor="middle">Ashwini â€¢ Pada 2</text>
                        
                        <text x="110" y="42" fill="#4A567A" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" textAnchor="middle">II</text>
                        <text x="105" y="70" fill="#16223F" fontFamily="Fraunces, serif" fontSize="13" fontWeight="600" textAnchor="middle">Ve â™€ 08Â°</text>
                        
                        <text x="290" y="42" fill="#4A567A" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" textAnchor="middle">XII</text>
                        <text x="295" y="70" fill="#16223F" fontFamily="Fraunces, serif" fontSize="13" fontWeight="600" textAnchor="middle">Me â˜¿ (R) 21Â°</text>
                        
                        <text x="60" y="196" fill="#7B5800" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" textAnchor="middle">IV</text>
                        <text x="115" y="198" fill="#022454" fontFamily="Fraunces, serif" fontSize="14" fontWeight="700" textAnchor="middle">Mo â˜½ 04Â°22'</text>
                        <text x="115" y="216" fill="#4A567A" fontFamily="Inter, sans-serif" fontSize="9" textAnchor="middle">Rohini (Sva)</text>
                        
                        <text x="200" y="375" fill="#7B5800" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" textAnchor="middle">VII â€¢ ASTAM</text>
                        <text x="200" y="315" fill="#022454" fontFamily="Fraunces, serif" fontSize="14" fontWeight="700" textAnchor="middle">Su â˜‰ 28Â°10'</text>
                        <text x="200" y="333" fill="#BA1A1A" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" textAnchor="middle">Sa â™„ (Deb.) 02Â°</text>
                        
                        <text x="340" y="196" fill="#7B5800" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" textAnchor="middle">X</text>
                        <text x="285" y="198" fill="#022454" fontFamily="Fraunces, serif" fontSize="14" fontWeight="700" textAnchor="middle">Ma â™‚ 19Â°45'</text>
                        <text x="285" y="216" fill="#4A567A" fontFamily="Inter, sans-serif" fontSize="9" textAnchor="middle">Digbala Peak</text>
                        
                        <text x="335" y="295" fill="#16223F" fontFamily="Fraunces, serif" fontSize="12" fontWeight="600" textAnchor="middle">IX â€¢ Ra â˜Š</text>
                        <text x="65" y="295" fill="#16223F" fontFamily="Fraunces, serif" fontSize="12" fontWeight="600" textAnchor="middle">V â€¢ Ke â˜‹</text>
                        
                        <circle cx="200" cy="200" r="5" fill="#D9A63C" />
                        <circle cx="200" cy="200" r="15" fill="none" stroke="#D9A63C" strokeWidth="1" />
                      </svg>

                      {/* Chart Footnote Pill */}
                      <div className="absolute bottom-4 left-4 right-4 bg-[#FFFDF6]/95 backdrop-blur-sm p-2.5 rounded-lg border border-[#E5DEC7] flex items-center justify-between shadow-xs">
                        <span className="text-xs text-[#16223F] font-semibold">
                          Bhavartha: <span className="text-[#4A567A] font-normal">Hamsa Yoga active via Guru in Kendra</span>
                        </span>
                        <span className="text-xs text-[#7b5800] hover:text-[#022454] font-bold cursor-pointer">
                          Inspect 16 Vargas â†’
                        </span>
                      </div>
                    </div>

                    {/* Corner Gold Accents */}
                    <div aria-hidden="true" className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#D9A63C]" />
                    <div aria-hidden="true" className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#D9A63C]" />
                    <div aria-hidden="true" className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#D9A63C]" />
                    <div aria-hidden="true" className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#D9A63C]" />
                  </div>
                </div>

                {/* Right Sub-column: Detailed Explanation */}
                <div className="lg:col-span-6 flex flex-col gap-6">
                  <div className="inline-flex items-center gap-2 self-start px-3.5 py-1 rounded-full bg-[#E8EEF8] border border-[#CBD9EE] text-[#1F3A6B] text-xs font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">schema</span>
                    Mathematical Precision
                  </div>
                  
                  <h2 className="font-['Fraunces',serif] text-3xl sm:text-4xl font-bold text-[#022454] tracking-tight">
                    Authentic Kundli Mathematics, Rendered With Zero Approximation.
                  </h2>
                  
                  <p className="text-base text-[#4A567A] leading-relaxed">
                    Every calculation executes true geocentric sidereal positions via Chitrapaksha Ayanamsa. We map planetary speeds, retrograde stations, and fractional shadbala power metrics to deliver actionable horary and lifetime counsel.
                  </p>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-[#FFFDF6] border border-[#E8DFC9]">
                      <div className="w-8 h-8 rounded-lg bg-[#FBF5E5] border border-[#E0CF9B] text-[#7b5800] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">adjust</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#16223F]">Fractional Navamsha (D9) Resolution</h4>
                        <p className="text-xs text-[#4A567A] mt-0.5">
                          Identifies the subtle dharmic destiny and matrimonial alignment hidden within each 3Â°20' arc of the zodiac.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-xl bg-[#FFFDF6] border border-[#E8DFC9]">
                      <div className="w-8 h-8 rounded-lg bg-[#E8EEF8] border border-[#CBD9EE] text-[#1F3A6B] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">flare</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#16223F]">Full Shadbala &amp; Ashtakavarga Bindus</h4>
                        <p className="text-xs text-[#4A567A] mt-0.5">
                          Evaluates directional, positional, temporal, and motional strength alongside 337 Sarvashtakavarga benefic dots.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                      className="inline-flex items-center gap-2 bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] text-sm font-semibold px-6 py-3 rounded-lg border border-[#D9A63C] shadow-xs transition-all cursor-pointer"
                    >
                      <span>Generate Your Free D1 &amp; D9 Chart</span>
                      <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">arrow_forward</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* â”€â”€ SECTION 4: TESTIMONIALS (Voices of Inquiry) â”€â”€ */}
          <section className="relative z-10 py-16 lg:py-20 border-t border-[#E8DFC9] bg-gradient-to-b from-[#FBF6EA] to-[#F5EEDC]">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
                <div>
                  <div className="flex items-center gap-2 text-[#7B5800] text-xs font-bold uppercase tracking-widest mb-2">
                    <span className="text-[#D9A63C]">âœ¦</span> Voices of Inquiry
                  </div>
                  <h2 className="font-['Fraunces',serif] text-3xl sm:text-4xl font-bold text-[#022454] tracking-tight">
                    Practitioner Testimonies
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#4A567A]">
                  <span className="w-2 h-2 rounded-full bg-[#D9A63C]"></span>
                  <span>Verified Jyotish Scholars &amp; Astrologers</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {/* Card 1 */}
                <div className="bg-[#FFFDF6] p-6 sm:p-7 rounded-2xl border-2 border-[#E5DEC7] shadow-xs flex flex-col justify-between hover:border-[#D9A63C] transition-all">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex text-[#D9A63C]">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-[18px]">star</span>
                        ))}
                      </div>
                      <span className="text-[#7B5800] font-['Fraunces',serif] text-3xl leading-none">â€œ</span>
                    </div>
                    <p className="font-['Inter',sans-serif] text-sm text-[#16223F] italic leading-relaxed">
                      The mathematical fidelity of the Navamsha and Dashamsha tables is unmatched. No fluffâ€”pure classical Jyotish computed flawlessly.
                    </p>
                  </div>
                  <div className="pt-5 mt-4 border-t border-[#EAE3D2]">
                    <span className="text-sm text-[#16223F] font-bold block">Dr. A. Sharma</span>
                    <span className="text-xs text-[#4A567A] block mt-0.5">Varanasi Sanskrit Vishwavidyalaya</span>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="bg-gradient-to-b from-[#FFFDF6] to-[#FFF9EE] p-6 sm:p-7 rounded-2xl border-2 border-[#D9A63C]/40 shadow-xs flex flex-col justify-between hover:border-[#D9A63C] transition-all">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex text-[#D9A63C]">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-[18px]">star</span>
                        ))}
                      </div>
                      <span className="text-[#7B5800] font-['Fraunces',serif] text-3xl leading-none">â€œ</span>
                    </div>
                    <p className="font-['Inter',sans-serif] text-sm text-[#16223F] italic leading-relaxed">
                      Finally an interface honoring the dignified scholarship of Bhrigu Samhita. The transit calculations match my manual ephemeris logs.
                    </p>
                  </div>
                  <div className="pt-5 mt-4 border-t border-[#EAE3D2]">
                    <span className="text-sm text-[#16223F] font-bold block">Rohit Mukherjee</span>
                    <span className="text-xs text-[#4A567A] block mt-0.5">Senior Horary Astrologer, Kolkata</span>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="bg-[#FFFDF6] p-6 sm:p-7 rounded-2xl border-2 border-[#E5DEC7] shadow-xs flex flex-col justify-between hover:border-[#D9A63C] transition-all">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex text-[#D9A63C]">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-[18px]">star</span>
                        ))}
                      </div>
                      <span className="text-[#7B5800] font-['Fraunces',serif] text-3xl leading-none">â€œ</span>
                    </div>
                    <p className="font-['Inter',sans-serif] text-sm text-[#16223F] italic leading-relaxed">
                      The triad remedy synthesis based on classical texts gives clear clarity to seekers without inducing superstitions. Truly an observatory.
                    </p>
                  </div>
                  <div className="pt-5 mt-4 border-t border-[#EAE3D2]">
                    <span className="text-sm text-[#16223F] font-bold block">Priya Venkat</span>
                    <span className="text-xs text-[#4A567A] block mt-0.5">Jyotish Acharya, Chennai</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* â”€â”€ SECTION 5: LIVE EPHEMERIS CLOCK BANNER â”€â”€ */}
          <section className="relative z-10 border-t border-[#E8DFC9] bg-[#FFFDF6] py-6">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16">
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#EBF2FA] via-[#FFFDF6] to-[#FFF6DC] border border-[#E0D8C3] shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4 text-[#4A567A]">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#D9A63C] animate-pulse shadow-xs"></span>
                  <span className="text-sm text-[#022454] font-bold">Live Celestial Clock:</span>
                  <span className="text-xs sm:text-sm text-[#16223F]">
                    Sun in Aquarius (Kumbha 05Â° 12'), Moon in Aries (Mesha 19Â° 44'), Jupiter Retrograde in Taurus
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="uppercase tracking-wider text-[#4A567A]">Ayanamsa: Chitrapaksha (Lahiri)</span>
                  <span className="text-[#D9A63C]">âœ¦</span>
                  <button
                    type="button"
                    onClick={() => navigate('/panchang')}
                    className="text-[#022454] font-bold hover:text-[#7B5800] underline underline-offset-2 cursor-pointer"
                  >
                    View Daily Panchang â†’
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* â”€â”€ ORGANIZED SCHOLARLY FOOTER â”€â”€ */}
      <footer className="w-full bg-[#12244A] text-[#F0DFAF] border-t border-[#D9A63C]/30 py-12">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="flex flex-col gap-2 max-w-md">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="material-symbols-outlined text-[#D9A63C] text-[20px]">flare</span>
              <span className="font-['Fraunces',serif] text-lg font-bold text-[#FFFDF6] tracking-tight">TRIKAL DARSHI</span>
              <span className="text-[#D9A63C]">âœ¦</span>
              <span className="text-xs text-[#F0DFAF] uppercase tracking-widest font-sans">à¤¤à¥à¤°à¤¿à¤•à¤¾à¤² à¤¦à¤°à¥à¤¶à¥€</span>
            </div>
            <p className="text-xs text-[#F0DFAF]/75 leading-relaxed">
              Vedic precision computing, Kundali delineations, and celestial timelines anchored in traditional Jyotish Shastra. Micro-arc precision ephemeris engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#F0DFAF]/90">
            <button type="button" onClick={() => navigate('/dashboard')} className="hover:text-[#D9A63C] transition-colors cursor-pointer">
              Soul Dashboard
            </button>
            <button type="button" onClick={() => navigate('/panchang')} className="hover:text-[#D9A63C] transition-colors cursor-pointer">
              Daily Panchang
            </button>
            <button type="button" onClick={() => navigate('/ask-ai')} className="hover:text-[#D9A63C] transition-colors cursor-pointer">
              AskAI Jyotish Guide
            </button>
            <button type="button" onClick={() => navigate('/charts')} className="hover:text-[#D9A63C] transition-colors cursor-pointer">
              Saved Ephemeris Charts
            </button>
          </div>

          <div className="text-xs text-[#F0DFAF]/60">
            Â© {new Date().getFullYear()} Trikal Darshi. All planetary coordinates verified.
          </div>
        </div>
      </footer>
    </div>
  );
}



