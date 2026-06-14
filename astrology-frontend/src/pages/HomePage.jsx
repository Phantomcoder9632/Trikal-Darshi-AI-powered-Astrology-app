import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { generateChart, getUserCharts } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

// Animated star field canvas
function StarCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    let animId;

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random(),
      speed: Math.random() * 0.4 + 0.1,
      dir: Math.random() > 0.5 ? 1 : -1,
    }));

    function draw() {
      ctx.clearRect(0, 0, w, h);
      stars.forEach(s => {
        s.a += s.speed * 0.008 * s.dir;
        if (s.a > 1 || s.a < 0.05) s.dir *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160, 105, 20, ${s.a * 0.22})`;
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

export default function HomePage() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const guestLoginRef = useRef(null);
  const { user, login, loginWithEmail, registerWithEmail, logout } = useAuth();

  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    time_of_birth: '',
    birth_time_confidence: 'exact',
    city_of_birth: '',
    current_city: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userCharts, setUserCharts] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

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
      setAuthError('Please fill in all required fields.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      if (authMode === 'login') {
        await loginWithEmail(authEmail, authPassword);
      } else {
        await registerWithEmail(authEmail, authPassword, authName);
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
            {mode === 'login' ? 'Sign In' : 'Register'}
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
            <div className="lp-field">
              <label htmlFor="auth_name" className="lp-label">Full Name</label>
              <input
                id="auth_name"
                type="text"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                placeholder="Enter your name"
                className="lp-input"
                required
              />
            </div>
          )}

          <div className="lp-field">
            <label htmlFor="auth_email" className="lp-label">Email Address</label>
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
            <label htmlFor="auth_password" className="lp-label">Password</label>
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
            {authMode === 'login' ? 'Enter the Cosmos' : 'Begin Journey'}
          </button>

          <div className="lp-divider-row">
            <span className="lp-divider-line" />
            <span className="lp-divider-text">or</span>
            <span className="lp-divider-line" />
          </div>

          <div className="lp-google-wrapper">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                setAuthLoading(true);
                setAuthError('');
                try {
                  const profile = await login(credentialResponse.credential);
                  if (profile) await handleAuthSuccess();
                } catch (err) {
                  setAuthError(err.response?.data?.detail || err.message || 'Google Sign-in failed. Please try again.');
                } finally {
                  setAuthLoading(false);
                }
              }}
              onError={() => setAuthError('Google Sign-in failed. Please try again.')}
              useOneTap
              theme="outline"
              shape="pill"
              size="large"
              width="280"
            />
          </div>
        </form>
      )}
    </div>
  );

  const renderBirthForm = () => (
    <form onSubmit={handleSubmit} id="birthForm" className="blueprint-form">
      <div className="blueprint-form-group">
        <label htmlFor="full_name" className="blueprint-label">Full Name *</label>
        <input
          id="full_name"
          type="text"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          placeholder="Enter your full name"
          autoComplete="name"
          className="blueprint-input"
        />
      </div>

      <div className="blueprint-form-group">
        <label htmlFor="date_of_birth" className="blueprint-label">Date of Birth *</label>
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
        <label htmlFor="time_of_birth" className="blueprint-label">Time of Birth *</label>
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
            { value: 'exact', label: 'Exact' },
            { value: 'approximate', label: 'Approximate' },
            { value: 'unknown', label: 'Unknown' },
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
        <label htmlFor="city_of_birth" className="blueprint-label">City of Birth *</label>
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
          Current City <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.55 }}>(optional)</span>
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

      <div className="lp-form-divider" aria-hidden="true">
        <div className="lp-form-divider-line" />
        <div className="lp-form-divider-diamond" />
        <div className="lp-form-divider-line" />
      </div>

      <button type="submit" id="generateBlueprintBtn" className="blueprint-button shimmer-button">
        <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>flare</span>
        Generate My Cosmic Blueprint
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
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#c9952a', fontVariationSettings: "'FILL' 1" }}>
                wb_sunny
              </span>
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

      {/* ════════════════════════════════════════════════════════════
           HERO SECTION
         ════════════════════════════════════════════════════════════ */}
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

        <div className={`lp-hero-inner ${!user ? 'lp-hero-split' : ''}`}>
          {!user ? (
            <>
              {/* Left — Brand */}
              <div className="lp-hero-left animate-up">
                {/* Badge */}
                <div className="lp-hero-eyebrow">
                  <span className="lp-eyebrow-dot" />
                  <span>AI-Powered Vedic Astrology</span>
                </div>

                {/* Wordmark */}
                <h1 className="lp-wordmark">
                  <span className="lp-wordmark-line1">Trikal</span>
                  <span className="lp-wordmark-line2">Darshi</span>
                </h1>

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
            </>
          ) : (
            /* Logged in — centered layout */
            <div className="lp-hero-centered animate-up">
              <div className="lp-hero-emblem">
                <span className="material-symbols-outlined lp-emblem-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
                <span className="lp-emblem-ring" />
                <span className="lp-emblem-ring lp-emblem-ring-2" />
              </div>

              <h1 className="lp-wordmark-centered delay-1 animate-up">Trikal Darshi</h1>

              <p className="lp-hero-tagline delay-2 animate-up" style={{ textAlign: 'center' }}>
                Vedic Jyotish · Lal Kitab · Numerology
              </p>

              <div className="lp-hero-badges delay-3 animate-up" style={{ justifyContent: 'center' }}>
                {['Divisional Charts', 'AI Streaming', 'Remedy Tripath'].map((b) => (
                  <span key={b} className="lp-hero-badge">{b}</span>
                ))}
              </div>

              <button id="heroScrollBtn" onClick={scrollToForm} className="lp-cta-primary delay-4 animate-up">
                <span>Begin Your Reading</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_downward</span>
              </button>
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="lp-scroll-indicator" aria-hidden="true">
          <div className="lp-scroll-mouse">
            <span className="lp-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
           FEATURES SECTION
         ════════════════════════════════════════════════════════════ */}
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

      {/* ════════════════════════════════════════════════════════════
           WISDOM / TESTIMONIALS STRIP
         ════════════════════════════════════════════════════════════ */}
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
                  <h3 className="lp-loading-title">Calculating your destiny…</h3>
                  <p className="lp-loading-text">Aligning planetary houses, dashas &amp; numerology matrix</p>
                </div>
              ) : (
                <div>
                  {/* Saved charts */}
                  {userCharts.length > 0 && (
                    <div className="lp-saved-charts">
                      <h3 className="lp-saved-title">Your Saved Cosmic Blueprints</h3>
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
                      <div className="lp-divider-row" style={{ margin: '24px 0' }}>
                        <span className="lp-divider-line" />
                        <span className="lp-divider-text">or create a new one</span>
                        <span className="lp-divider-line" />
                      </div>
                    </div>
                  )}
                  {renderBirthForm()}
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
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#c9952a', fontVariationSettings: "'FILL' 1" }}>wb_sunny</span>
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
