import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { generateChart, getUserCharts } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { i18nLangToBackend, backendLangToI18n } from '../i18n';
import LanguageSelect from '../components/LanguageSelect';

const FEATURES = [
  {
    id: 'charts',
    icon: 'grid_view',
    title: 'Divisional Kundali',
    desc: 'D1 · D9 · D10 · D4 · D7 · D30 and more — rendered in authentic North Indian style with dignity indicators.',
    accent: '#f0c060',
  },
  {
    id: 'ai',
    icon: 'auto_awesome',
    title: 'AI-Powered Readings',
    desc: 'Gemini-powered streaming interpretations across 10 life sections — Career, Wealth, Love, Health & Remedies.',
    accent: '#9b8cf7',
  },
  {
    id: 'remedies',
    icon: 'healing',
    title: 'Remedy Tripath System',
    desc: 'Tailored remedies spanning Vedic Mantras, Lal Kitab Farmaans, and Numerological corrections.',
    accent: '#5fc9a0',
  },
];

const STATS = [
  { num: '16+', label: 'Divisional Charts' },
  { num: '10', label: 'Life Sections' },
  { num: '3', label: 'Wisdom Streams' },
  { num: '∞', label: 'Cosmic Insights' },
];

const TESTIMONIALS = [
  {
    quote: 'The AI interpretations are uncannily accurate. It described my career challenges with remarkable precision.',
    name: 'Priya S.',
    role: 'Vedic Astrology Enthusiast',
    initial: 'P',
  },
  {
    quote: 'I never expected technology to understand Lal Kitab this deeply. The remedy tripath is a masterpiece.',
    name: 'Arjun M.',
    role: 'Jyotish Practitioner',
    initial: 'A',
  },
  {
    quote: 'Finally an app that treats Jyotish with the seriousness it deserves. The divisional charts are flawless.',
    name: 'Kavita R.',
    role: 'Numerology Student',
    initial: 'K',
  },
];

// Animated golden shimmer star field canvas
function StarCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    let animId;

    // Mix of tiny stars AND larger golden sparkles
    const stars = Array.from({ length: 240 }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: i < 180 ? Math.random() * 1.0 + 0.2 : Math.random() * 2.2 + 1.0, // some bigger sparkles
      a: Math.random(),
      speed: Math.random() * 0.35 + 0.08,
      dir: Math.random() > 0.5 ? 1 : -1,
      gold: i >= 160, // last 80 are golden sparkles
    }));

    function draw() {
      ctx.clearRect(0, 0, w, h);
      stars.forEach(s => {
        s.a += s.speed * 0.007 * s.dir;
        if (s.a > 1 || s.a < 0.04) s.dir *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        if (s.gold) {
          ctx.fillStyle = `rgba(201, 149, 42, ${s.a * 0.45})`;
        } else {
          ctx.fillStyle = `rgba(140, 100, 20, ${s.a * 0.18})`;
        }
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      stars.forEach(s => { s.x = Math.random() * w; s.y = Math.random() * h; });
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={canvasRef} className="lp-star-canvas" aria-hidden="true" />;
}

// Yantra SVG ornament
function YantraSVG({ size = 200, opacity = 0.18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }} aria-hidden="true">
      <circle cx="100" cy="100" r="96" stroke="#c9952a" strokeWidth="0.8" />
      <circle cx="100" cy="100" r="70" stroke="#c9952a" strokeWidth="0.5" />
      <circle cx="100" cy="100" r="44" stroke="#c9952a" strokeWidth="0.5" />
      <polygon points="100,10 190,165 10,165" stroke="#c9952a" strokeWidth="0.7" fill="none" />
      <polygon points="100,190 10,35 190,35" stroke="#c9952a" strokeWidth="0.7" fill="none" />
      <polygon points="100,40 172,160 28,160" stroke="#c9952a" strokeWidth="0.4" fill="none" strokeOpacity="0.5" />
      <polygon points="100,160 28,40 172,40" stroke="#c9952a" strokeWidth="0.4" fill="none" strokeOpacity="0.5" />
      <circle cx="100" cy="100" r="8" stroke="#c9952a" strokeWidth="0.6" />
      <circle cx="100" cy="100" r="3" fill="#c9952a" fillOpacity="0.5" />
    </svg>
  );
}

// Parallax banner hook
function useBannerParallax() {
  useEffect(() => {
    const banner = document.querySelector('.cosmic-banner-img');
    if (!banner) return;

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          // Subtle parallax: moves at 25% of scroll speed
          const offset = Math.min(scrollY * 0.25, 40);
          banner.style.setProperty('--banner-parallax', `${offset}px`);
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
}

export default function HomePage() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const guestLoginRef = useRef(null);
  const { user, login, loginWithEmail, registerWithEmail, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [signupLanguage, setSignupLanguage] = useState('english');

  // Banner parallax on scroll
  useBannerParallax();

  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [formData, setFormData] = useState(() => {
    // Use the language chosen in the welcome modal (or user's saved preference)
    const savedLang = localStorage.getItem('trikal_lang_chosen')
      || user?.preferred_language
      || 'english';
    return {
      full_name: '',
      date_of_birth: '',
      time_of_birth: '',
      birth_time_confidence: 'exact',
      city_of_birth: '',
      current_city: '',
      language: savedLang,
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userCharts, setUserCharts] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [showBirthForm, setShowBirthForm] = useState(false);

  const handleAuthSuccess = async () => {
    try {
      const data = await getUserCharts();
      setUserCharts(data || []);
    } catch (err) {
      console.error(err);
    }
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  };

  useEffect(() => {
    async function loadCharts() {
      setLoadingCharts(true);
      try {
        const data = await getUserCharts();
        setUserCharts(data || []);
      } catch (err) {
        console.error('Failed to load user charts:', err);
        if (err.response?.status === 401) logout();
      } finally {
        setLoadingCharts(false);
      }
    }
    loadCharts();
  }, []);

  // Sync user preferred language to UI and form state on mount/change
  useEffect(() => {
    if (user?.preferred_language) {
      const parsedLang = user.preferred_language.toLowerCase().trim();
      setFormData((prev) => ({
        ...prev,
        language: parsedLang
      }));
      i18n.changeLanguage(backendLangToI18n(parsedLang));
      localStorage.setItem('trikal_lang_chosen', parsedLang);
    }
  }, [user]);

  // Sync globally selected i18n language into formData.language to catch welcome modal choice
  useEffect(() => {
    const activeI18n = i18n.language || 'en';
    const backendLangMap = { en: 'english', hi: 'hindi', bn: 'bengali' };
    const resolvedLang = backendLangMap[activeI18n] || 'english';
    setFormData((prev) => ({
      ...prev,
      language: resolvedLang
    }));
  }, [i18n.language]);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    const elements = document.querySelectorAll('[data-reveal]');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Testimonial auto-rotate
  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(a => (a + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(t);
  }, []);

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
      setError(t('dashboard.modal.fill_required'));
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

  // Custom Google login using popup mode — avoids the GSI One Tap redirect freeze on mobile
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setAuthError('');
      try {
        // Step 1: Verify the access token by fetching Google user info on the frontend
        const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!googleRes.ok) {
          throw new Error('Could not verify your Google account. Please try again.');
        }
        // Step 2: Send to backend for account creation / login
        const profile = await login(tokenResponse.access_token);
        if (profile) await handleAuthSuccess();
      } catch (err) {
        console.error('Google login error:', err);
        // Never expose raw token content in the error message
        const rawDetail = err.response?.data?.detail || err.message || '';
        const isTokenError = rawDetail.toLowerCase().includes('token') || rawDetail.toLowerCase().includes('segment');
        const friendlyMsg = isTokenError
          ? 'Google Sign-in is temporarily unavailable. Please try again in a moment or use email/password.'
          : (rawDetail || 'Google Sign-in failed. Please try again.');
        setAuthError(friendlyMsg);
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google login failed:', err);
      setAuthError('Google Sign-in failed. Please try again.');
    },
    flow: 'implicit',
    ux_mode: 'popup',
  });

  const scrollToForm = () => {
    if (!user) {
      guestLoginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword || (authMode === 'register' && !authName)) {
      setAuthError(t('dashboard.modal.fill_required'));
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      if (authMode === 'login') {
        await loginWithEmail(authEmail, authPassword);
      } else {
        await registerWithEmail(authEmail, authPassword, authName, signupLanguage);
      }
      await handleAuthSuccess();
    } catch (err) {
      console.error(err);
      setAuthError(err.response?.data?.detail || err.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const renderAuthForm = () => (
    <div className="lp-auth-form-wrapper">
      {/* Tabs */}
      <div className="lp-auth-tabs">
        {['login', 'register'].map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => { setAuthMode(mode); setAuthError(''); }}
            className={`lp-auth-tab ${authMode === mode ? 'active' : ''}`}
          >
            {mode === 'login' ? t('nav.signIn') : t('nav.signUp')}
          </button>
        ))}
      </div>

      {authError && (
        <div className="lp-error-banner">
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>error</span>
          <span>{authError}</span>
        </div>
      )}

      {authLoading ? (
        <div className="lp-loading-state">
          <div className="lp-spinner">
            <span className="material-symbols-outlined" style={{ fontSize: 36 }}>progress_activity</span>
          </div>
          <p className="lp-loading-text">Connecting to the cosmos…</p>
        </div>
      ) : (
        <form onSubmit={handleAuthSubmit} className="lp-form">
          {authMode === 'register' && (
            <>
              <div className="lp-field">
                <label htmlFor="auth_name" className="lp-label">{t('home.form.fullName')}</label>
                <input
                  id="auth_name"
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder={t('home.form.fullName')}
                  className="lp-input"
                  required
                />
              </div>
              <div className="lp-field">
                <label htmlFor="signup_language" className="lp-label">
                  <span className="material-symbols-outlined" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 4 }}>translate</span>
                  {t('auth.selectLanguage')}
                </label>
                <LanguageSelect
                  id="signup_language"
                  value={signupLanguage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSignupLanguage(val);
                    i18n.changeLanguage(backendLangToI18n(val));
                  }}
                />
              </div>
            </>
          )}

          <div className="lp-field">
            <label htmlFor="auth_email" className="lp-label">{t('auth.email')}</label>
            <input
              id="auth_email"
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="seeker@example.com"
              className="lp-input"
              required
            />
          </div>

          <div className="lp-field">
            <label htmlFor="auth_password" className="lp-label">{t('auth.password')}</label>
            <input
              id="auth_password"
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••"
              className="lp-input"
              required
            />
          </div>

          <button type="submit" className="lp-submit-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>vpn_key</span>
            {authMode === 'login' ? t('auth.enterCosmos') : t('auth.beginJourney')}
          </button>

          <div className="lp-divider-row">
            <span className="lp-divider-line" />
            <span className="lp-divider-text">or</span>
            <span className="lp-divider-line" />
          </div>

          <div className="lp-google-wrapper">
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={googleLoading}
              className="lp-google-btn"
              aria-label={t('auth.continueGoogle')}
            >
              {googleLoading ? (
                <span className="material-symbols-outlined lp-spinner" style={{ fontSize: 18 }}>progress_activity</span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                  <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.583c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.167 6.656 3.583 9 3.583z" fill="#EA4335" />
                </svg>
              )}
              <span>{t('auth.continueGoogle')}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );

  const renderBirthForm = () => (
    <form onSubmit={handleSubmit} id="birthForm" className="blueprint-form">
      <div className="blueprint-form-group">
        <label htmlFor="full_name" className="blueprint-label">{t('home.form.fullName')} *</label>
        <input
          id="full_name"
          type="text"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          placeholder={t('home.form.fullName')}
          autoComplete="name"
          className="blueprint-input"
        />
      </div>

      <div className="blueprint-form-group">
        <label htmlFor="date_of_birth" className="blueprint-label">{t('home.form.dateOfBirth')} *</label>
        <input
          id="date_of_birth"
          type="date"
          name="date_of_birth"
          value={formData.date_of_birth}
          onChange={handleChange}
          max={new Date().toISOString().split('T')[0]}
          className="blueprint-input"
        />
      </div>

      <div className="blueprint-form-group">
        <label htmlFor="time_of_birth" className="blueprint-label">{t('home.form.timeOfBirth')} *</label>
        <input
          id="time_of_birth"
          type="time"
          name="time_of_birth"
          value={formData.time_of_birth}
          onChange={handleChange}
          className="blueprint-input"
        />
        <div className="blueprint-pill-container">
          {[
            { value: 'exact', label: t('home.form.confidence.exact') },
            { value: 'approximate', label: t('home.form.confidence.approximate') },
            { value: 'unknown', label: t('home.form.confidence.unknown') },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, birth_time_confidence: value }))}
              className={`blueprint-pill${formData.birth_time_confidence === value ? ' active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="blueprint-form-group">
        <label htmlFor="city_of_birth" className="blueprint-label">{t('home.form.cityOfBirth')} *</label>
        <div className="blueprint-input-row">
          <span className="material-symbols-outlined text-outline text-[20px] shrink-0">location_on</span>
          <input
            id="city_of_birth"
            type="text"
            name="city_of_birth"
            value={formData.city_of_birth}
            onChange={handleChange}
            placeholder="e.g. Kolkata, West Bengal"
            autoComplete="off"
            className="blueprint-input"
          />
        </div>
      </div>

      <div className="blueprint-form-group">
        <label htmlFor="current_city" className="blueprint-label">
          {t('home.form.currentCity')} <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.55 }}>{t('home.form.optional')}</span>
        </label>
        <div className="blueprint-input-row">
          <span className="material-symbols-outlined text-outline text-[20px] shrink-0">my_location</span>
          <input
            id="current_city"
            type="text"
            name="current_city"
            value={formData.current_city}
            onChange={handleChange}
            placeholder="e.g. Mumbai, Maharashtra"
            autoComplete="off"
            className="blueprint-input"
          />
        </div>
      </div>

      <div className="blueprint-form-group">
        <label htmlFor="chart_language" className="blueprint-label">
          <span className="material-symbols-outlined" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 4 }}>translate</span>
          {t('home.form.language')}
        </label>
        <LanguageSelect
          id="chart_language"
          name="language"
          value={formData.language || 'english'}
          onChange={handleChange}
        />
        <p style={{ fontSize: 11, color: 'var(--color-text-muted, #aaa)', marginTop: 4, marginBottom: 0 }}>
          {t('home.form.languageNote')}
        </p>
      </div>

      <div className="lp-form-divider" aria-hidden="true">
        <div className="lp-form-divider-line" />
        <div className="lp-form-divider-diamond" />
        <div className="lp-form-divider-line" />
      </div>

      <button type="submit" id="generateBlueprintBtn" className="blueprint-button shimmer-button">
        <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>flare</span>
        {t('home.form.submit')}
      </button>
    </form>
  );

  return (
    <div className="lp-root">

      {/* ── TOP NAVBAR ── */}
      <header className="lp-navbar">
        <div className="lp-navbar-inner">
          <div className="lp-navbar-logo">
            <div className="lp-navbar-emblem">
              <img src="/Trikal_Darshi_logo.png" alt="Trikal Darshi Logo" className="lp-navbar-logo-img" />
            </div>
            <span className="lp-navbar-brand">Trikal Darshi</span>
          </div>

          <nav className="lp-navbar-links" aria-label="Main navigation">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#wisdom" className="lp-nav-link">Wisdom</a>
            {!user && (
              <button
                onClick={scrollToForm}
                className="lp-nav-cta"
                id="navBeginBtn"
              >
                Begin Reading
              </button>
            )}
            {user && (
              <div className="lp-navbar-user">
                <div className="lp-navbar-avatar">
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="lp-navbar-name">{user.name?.split(' ')[0]}</span>
                <button onClick={logout} className="lp-navbar-logout" title="Logout">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* ── Cosmic Project Banner — GUEST ONLY ── */}
      {!user && (
        <section className="cosmic-banner-section">
          <div className="cosmic-banner-container animate-up">
            <img src="/trikal_darshi_banner_with_footer.png" alt="Trikal Darshi Banner" className="cosmic-banner-img" />
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════
           HERO SECTION — GUEST ONLY
         ════════════════════════════════════════════════════════════ */}
      {!user && (
        <section className="lp-hero" aria-label="Trikal Darshi hero section">
          {/* Star canvas */}
          <StarCanvas />

          {/* Radial ambient glows */}
          <div className="lp-hero-glow lp-glow-1" aria-hidden="true" />
          <div className="lp-hero-glow lp-glow-2" aria-hidden="true" />
          <div className="lp-hero-glow lp-glow-3" aria-hidden="true" />

          {/* Yantra ornament */}
          <div className="lp-hero-yantra" aria-hidden="true">
            <YantraSVG size={520} opacity={0.09} />
          </div>

          <div className="lp-hero-inner lp-hero-split">
            {/* Left — Brand */}
            <div className="lp-hero-left animate-up">
              {/* Badge */}
              <div className="lp-hero-eyebrow">
                <span className="lp-eyebrow-dot" />
                <span>AI-Powered Vedic Astrology</span>
              </div>

              <p className="lp-hero-tagline delay-1 animate-up">
                Vedic Jyotish · Lal Kitab · Numerology
              </p>

              <p className="lp-hero-sub delay-2 animate-up">
                Unlock the ancient science of Jyotish through AI-powered readings.
                Your full Kundali, dashas, and personalised remedies — all in one sacred space.
              </p>

              {/* Feature pills */}
              <div className="lp-hero-badges delay-3 animate-up" aria-label="Key features">
                {['Divisional Charts', 'AI Streaming', 'Remedy Tripath', '10+ Life Sections'].map((b) => (
                  <span key={b} className="lp-hero-badge">{b}</span>
                ))}
              </div>

              {/* CTA */}
              <div className="lp-hero-cta-row delay-4 animate-up">
                <button id="heroScrollBtn" onClick={scrollToForm} className="lp-cta-primary" aria-label="Scroll to login">
                  <span>Begin Your Reading</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_downward</span>
                </button>
                <a href="#features" className="lp-cta-ghost">See Features</a>
              </div>

              {/* Stats row */}
              <div className="lp-hero-stats delay-4 animate-up">
                {STATS.map((s, i) => (
                  <React.Fragment key={s.label}>
                    {i > 0 && <div className="lp-stat-sep" />}
                    <div className="lp-stat">
                      <span className="lp-stat-num">{s.num}</span>
                      <span className="lp-stat-label">{s.label}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Right — Login Card */}
            <div ref={guestLoginRef} className="lp-hero-right animate-up delay-2">
              <div className="lp-login-card">
                {/* Card header */}
                <div className="lp-card-header">
                  <div className="lp-card-emblem">
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#c9952a', fontVariationSettings: "'FILL' 1" }}>
                      auto_awesome
                    </span>
                  </div>
                  <div>
                    <p className="lp-card-kicker">Your Cosmic Journey</p>
                    <h2 className="lp-card-title">
                      {authMode === 'login' ? 'Welcome Back' : 'Join Trikal Darshi'}
                    </h2>
                  </div>
                </div>
                {renderAuthForm()}
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="lp-scroll-indicator" aria-hidden="true">
            <div className="lp-scroll-mouse">
              <span className="lp-scroll-dot" />
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════
           LOGGED-IN WELCOME HEADER
         ════════════════════════════════════════════════════════════ */}
      {user && (
        <section className="lp-logged-welcome" aria-label="Welcome back">
          <div className="lp-logged-welcome-inner">
            <div className="lp-logged-welcome-emblem" aria-hidden="true">
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#c9952a', fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
            </div>
            <div>
              <p className="lp-logged-welcome-greeting">
                Welcome back, <strong>{user.name?.split(' ')[0] || 'Seeker'}</strong> ✦
              </p>
              <p className="lp-logged-welcome-sub">
                Your cosmic journey awaits. Generate a new chart or view your saved blueprints below.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════
           FEATURES SECTION — GUEST ONLY
         ════════════════════════════════════════════════════════════ */}
      {!user && (
        <section className="lp-features" id="features" aria-label="Platform features">
          <div className="lp-section-inner">

            <div className="lp-section-header" data-reveal>
              <span className="lp-section-kicker">What We Offer</span>
              <h2 className="lp-section-title">Ancient Science,<br />Modern Intelligence</h2>
              <p className="lp-section-sub">
                Three pillars of Vedic wisdom, unified under one AI-powered platform.
              </p>
            </div>

            <div className="lp-features-grid">
              {FEATURES.map((f, i) => (
                <div
                  key={f.id}
                  className="lp-feature-card"
                  data-reveal
                  data-delay={String(i + 1)}
                  style={{ '--accent': f.accent }}
                >
                  <div className="lp-feature-icon-wrap">
                    <span
                      className="material-symbols-outlined lp-feature-icon"
                      style={{ fontVariationSettings: "'FILL' 1", color: f.accent }}
                    >
                      {f.icon}
                    </span>
                  </div>
                  <h3 className="lp-feature-title">{f.title}</h3>
                  <p className="lp-feature-desc">{f.desc}</p>
                  <div className="lp-feature-arrow">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: f.accent }}>arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════
           WISDOM / TESTIMONIALS STRIP — GUEST ONLY
         ════════════════════════════════════════════════════════════ */}
      {!user && (
        <section className="lp-wisdom" id="wisdom" aria-label="Wisdom from seekers">
          <div className="lp-section-inner">
            <div className="lp-section-header" data-reveal>
              <span className="lp-section-kicker">From the Seekers</span>
              <h2 className="lp-section-title">What the Stars Revealed</h2>
            </div>

            <div className="lp-testimonials" data-reveal data-delay="1">
              <div className="lp-testimonial-track">
                {TESTIMONIALS.map((t, i) => (
                  <div
                    key={i}
                    className={`lp-testimonial-card ${i === activeTestimonial ? 'active' : ''}`}
                    aria-hidden={i !== activeTestimonial}
                  >
                    <span className="lp-quote-mark">❝</span>
                    <p className="lp-testimonial-quote">{t.quote}</p>
                    <div className="lp-testimonial-author">
                      <div className="lp-testimonial-avatar">{t.initial}</div>
                      <div>
                        <p className="lp-testimonial-name">{t.name}</p>
                        <p className="lp-testimonial-role">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="lp-testimonial-dots" role="tablist" aria-label="Testimonials navigation">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={i === activeTestimonial}
                    aria-label={`Testimonial ${i + 1}`}
                    className={`lp-testimonial-dot ${i === activeTestimonial ? 'active' : ''}`}
                    onClick={() => setActiveTestimonial(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════
           BIRTH FORM SECTION (logged-in only)
         ════════════════════════════════════════════════════════════ */}
      {user && (
        <section
          ref={formRef}
          className="lp-birth-section"
          id="birthFormSection"
          aria-label="Birth details form"
        >
          <div className="lp-section-inner lp-section-narrow">

            <header className="lp-section-header animate-up" data-reveal>
              <span className="lp-section-kicker">Your Cosmic Blueprint</span>
              <h2 className="lp-section-title">Enter Your Birth Details</h2>
              <p className="lp-section-sub">
                Precise birth data unlocks the most accurate planetary interpretations.
              </p>
            </header>

            <div className="lp-birth-card animate-up" data-reveal data-delay="1">

              {error && (
                <div className="lp-error-banner" style={{ marginBottom: 24 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>error</span>
                  <span>{error}</span>
                </div>
              )}

              {loading ? (
                <div className="lp-loading-state">
                  <div className="lp-spinner">
                    <span className="material-symbols-outlined" style={{ fontSize: 40 }}>progress_activity</span>
                  </div>
                  <h3 className="lp-loading-title">{t('home.form.calculatingDestiny')}</h3>
                  <p className="lp-loading-text">{t('home.form.aligningMatrix')}</p>
                </div>
              ) : (
                <div>
                  {/* Saved charts */}
                  {userCharts.length > 0 && (
                    <div className="lp-saved-charts">
                      <h3 className="lp-saved-title">{t('home.form.savedBlueprints')}</h3>
                      <div className="lp-saved-grid">
                        {userCharts.map((chart) => (
                          <div
                            key={chart.chart_id}
                            onClick={() => navigate(`/dashboard/${chart.chart_id}`)}
                            className="lp-saved-card"
                          >
                            <div className="lp-saved-icon">
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#c9952a', fontVariationSettings: "'FILL' 1" }}>stars</span>
                            </div>
                            <div className="lp-saved-info">
                              <span className="lp-saved-name">{chart.full_name}</span>
                              <span className="lp-saved-meta">{chart.date_of_birth} · {chart.city_of_birth}</span>
                            </div>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#c9952a', marginLeft: 'auto' }}>arrow_forward</span>
                          </div>
                        ))}
                      </div>

                      {!showBirthForm && (
                        <div className="flex justify-center mt-6">
                          <button
                            type="button"
                            onClick={() => setShowBirthForm(true)}
                            className="blueprint-button shimmer-button max-w-xs w-full flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined">add_circle</span>
                            {t('home.form.addNewMember')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Render the birth form if we don't have saved charts, OR if showBirthForm is true */}
                  {(userCharts.length === 0 || showBirthForm) && (
                    <div className="mt-8 animate-fade-in">
                      {userCharts.length > 0 && (
                        <div className="flex justify-between items-center mb-6 border-b border-outline-variant/15 pb-3">
                          <h3 className="text-xs uppercase font-bold tracking-widest text-primary">{t('home.form.newCosmicMember')}</h3>
                          <button
                            type="button"
                            onClick={() => setShowBirthForm(false)}
                            className="text-xs text-outline hover:text-primary flex items-center gap-1 font-semibold cursor-pointer bg-transparent border-none"
                          >
                            <span className="material-symbols-outlined text-[14px]">cancel</span>
                            {t('dashboard.modal.cancel')}
                          </button>
                        </div>
                      )}
                      {renderBirthForm()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════
           FOOTER
         ════════════════════════════════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-yantra" aria-hidden="true">
          <YantraSVG size={160} opacity={0.06} />
        </div>

        <div className="lp-section-inner">
          <div className="lp-footer-inner">
            {/* Brand */}
            <div className="lp-footer-brand">
              <div className="lp-footer-emblem">
                <img src="/Trikal_Darshi_logo.png" alt="Trikal Darshi Logo" className="lp-footer-logo-img" />
              </div>
              <span className="lp-footer-name">Trikal Darshi</span>
            </div>

            <p className="lp-footer-tagline">Ancient Wisdom · Modern Precision</p>

            {/* Discipline pills */}
            <div className="lp-footer-pills">
              {['Vedic Jyotish', 'Lal Kitab', 'Numerology'].map((item) => (
                <span key={item} className="lp-footer-pill">{item}</span>
              ))}
            </div>

            <div className="lp-footer-divider" aria-hidden="true">
              <div className="lp-footer-line" />
              <span className="lp-footer-diamond">✦</span>
              <div className="lp-footer-line" />
            </div>

            <p className="lp-footer-copy">© 2025 Trikal Darshi · All Rights Reserved</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
