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
    desc: 'D1 · D9 · D10 · D4 · D7 · D30 and more — all rendered in authentic North Indian style with dignity indicators.',
  },
  {
    id: 'ai',
    icon: 'auto_awesome',
    title: 'AI-Powered Readings',
    desc: 'Gemini-powered streaming interpretations across 10 life sections — from Career & Wealth to Love, Health & Remedies.',
  },
  {
    id: 'remedies',
    icon: 'healing',
    title: 'Remedy Tripath System',
    desc: 'Tailored remedies spanning Vedic Mantras, Lal Kitab Farmaans, and Numerological corrections across three distinct paths.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const guestLoginRef = useRef(null);
  const { user, login, loginWithEmail, registerWithEmail, logout } = useAuth();

  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

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

  useEffect(() => {
    async function loadCharts() {
      setLoadingCharts(true);
      try {
        const data = await getUserCharts();
        setUserCharts(data || []);
      } catch (err) {
        console.error('Failed to load user charts:', err);
        if (err.response?.status === 401) {
          logout();
        }
      } finally {
        setLoadingCharts(false);
      }
    }
    loadCharts();
  }, []);

  // Scroll Reveal Observer
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
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('[data-reveal]');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
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

  const renderAuthForm = () => {
    return (
      <div className="auth-form-wrapper text-left">
        {/* Toggle between Login and Register */}
        <div className="auth-tabs-container mb-6 flex border-b border-outline-variant/30">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setAuthError(''); }}
            className={`auth-tab-btn flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-all duration-200 ${authMode === 'login'
              ? 'text-primary border-b-2 border-primary border-solid'
              : 'text-outline/60 hover:text-outline'
              }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setAuthError(''); }}
            className={`auth-tab-btn flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-all duration-200 ${authMode === 'register'
              ? 'text-primary border-b-2 border-primary border-solid'
              : 'text-outline/60 hover:text-outline'
              }`}
          >
            Sign Up
          </button>
        </div>

        {authError && (
          <div className="mb-6 flex items-start gap-3 bg-error/8 border border-error/25 rounded-xl p-4 text-sm text-error font-medium">
            <span
              className="material-symbols-outlined text-[18px] shrink-0 mt-0.5"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
            <span>{authError}</span>
          </div>
        )}

        {authLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
            <div className="relative w-14 h-14 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-primary-container text-[40px] animate-spin">
                progress_activity
              </span>
              <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-50" />
            </div>
            <p className="text-on-surface-variant text-sm font-accent-italic italic">
              Connecting to Trikal cosmos...
            </p>
          </div>
        ) : (
          <form onSubmit={handleAuthSubmit} className="blueprint-form">
            {authMode === 'register' && (
              <div className="blueprint-form-group">
                <label htmlFor="auth_name" className="blueprint-label">Full Name *</label>
                <input
                  id="auth_name"
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Enter your name"
                  className="blueprint-input"
                  required
                />
              </div>
            )}

            <div className="blueprint-form-group">
              <label htmlFor="auth_email" className="blueprint-label">Email Address *</label>
              <input
                id="auth_email"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="seeker@example.com"
                className="blueprint-input"
                required
              />
            </div>

            <div className="blueprint-form-group">
              <label htmlFor="auth_password" className="blueprint-label">Password *</label>
              <input
                id="auth_password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="blueprint-input"
                required
              />
            </div>

            <button
              type="submit"
              className="blueprint-button shimmer-button mt-4"
            >
              <span className="material-symbols-outlined text-[18px]">
                vpn_key
              </span>
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>

            {/* Separator */}
            <div className="relative flex items-center justify-center py-2 mt-2">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-outline-variant/40 to-transparent" />
              <span className="absolute bg-background px-3 text-[10px] text-outline/50 uppercase tracking-widest font-bold">
                Or Continue With
              </span>
            </div>

            {/* Google Login Button */}
            <div className="flex justify-center mt-2 google-login-btn-wrapper">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  setAuthLoading(true);
                  setAuthError('');
                  try {
                    const profile = await login(credentialResponse.credential);
                    if (profile) {
                      await handleAuthSuccess();
                    }
                  } catch (err) {
                    setAuthError('Google Sign-in failed. Please try again.');
                  } finally {
                    setAuthLoading(false);
                  }
                }}
                onError={() => setAuthError('Google Sign-in failed. Please try again.')}
                useOneTap
                theme="filled_blue"
                shape="pill"
                size="large"
              />
            </div>
          </form>
        )}
      </div>
    );
  };

  const renderBirthForm = () => {
    return (
      <form onSubmit={handleSubmit} id="birthForm" className="blueprint-form">
        {/* Full Name */}
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

        {/* Date of Birth */}
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

        {/* Time of Birth + Confidence */}
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

        {/* City of Birth */}
        <div className="blueprint-form-group">
          <label htmlFor="city_of_birth" className="blueprint-label">City of Birth *</label>
          <div className="blueprint-input-row">
            <span className="material-symbols-outlined text-outline text-[20px] shrink-0">
              location_on
            </span>
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

        {/* Current City */}
        <div className="blueprint-form-group">
          <label htmlFor="current_city" className="blueprint-label">
            Current City{' '}
            <span className="font-normal normal-case opacity-60">(optional)</span>
          </label>
          <div className="blueprint-input-row">
            <span className="material-symbols-outlined text-outline text-[20px] shrink-0">
              my_location
            </span>
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

        {/* Ornament divider */}
        <div className="relative flex items-center justify-center py-1">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-outline-variant/40 to-transparent" />
          <div className="absolute w-2 h-2 bg-primary-container rounded-sm rotate-45 border border-primary/20" />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          id="generateBlueprintBtn"
          className="blueprint-button shimmer-button"
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            flare
          </span>
          Generate My Cosmic Blueprint
        </button>
      </form>
    );
  };

  return (
    <div className="min-h-screen font-body-md">

      {/* ── Glassmorphic Top Navbar ── */}
      <header className="landing-navbar">
        <div className="landing-navbar-inner">
          <div className="navbar-logo">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0 font-bold">
              wb_sunny
            </span>
            <span className="navbar-brand">Trikal Darshi</span>
          </div>

          {user && (
            <div className="navbar-profile">
              <button onClick={logout} className="navbar-logout-btn">
                <span className="material-symbols-outlined text-[15px]">logout</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════
           HERO
         ════════════════════════════════════════════════════════════ */}
      <section className="landing-hero" aria-label="Trikal Darshi hero section">

        {/* Radial glow layer */}
        <div className="landing-hero-bg" aria-hidden="true" />

        <div className={`landing-hero-inner ${!user ? 'hero-split-layout' : ''}`}>
          {!user ? (
            <>
              {/* Left Column - Brand Info */}
              <div className="hero-left-column">
                {/* Animated emblem */}
                <div className="landing-emblem animate-up" aria-hidden="true">
                  <span
                    className="material-symbols-outlined landing-emblem-icon"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    auto_awesome
                  </span>
                  <span className="landing-emblem-ring" />
                  <span className="landing-emblem-ring landing-emblem-ring-2" />
                </div>

                {/* Brand wordmark */}
                <h1 className="landing-wordmark animate-up delay-1">
                  Trikal Darshi
                </h1>

                {/* Sanskrit subtitle */}
                <p className="landing-tagline animate-up delay-2">
                  Vedic Jyotish · Lal Kitab · Numerology
                </p>

                {/* Feature pill badges */}
                <div className="landing-badge-row animate-up delay-3" aria-label="Key features">
                  {['10+ Life Sections', 'AI Streaming', 'Remedy Tripath'].map((b) => (
                    <span key={b} className="landing-badge">{b}</span>
                  ))}
                </div>

                {/* Primary CTA */}
                <button
                  id="heroScrollBtn"
                  onClick={scrollToForm}
                  className="landing-cta animate-up delay-4"
                  aria-label="Scroll down to login form"
                >
                  <span>Begin Your Reading</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    arrow_downward
                  </span>
                </button>
              </div>

              {/* Right Column - Unified Login/Register Card */}
              <div ref={guestLoginRef} className="hero-right-column animate-up delay-1">
                <div className="blueprint-card login-card-container-inline">
                  <header className="landing-form-heading animate-up mb-4 text-center">
                    <span className="landing-form-heading-kicker">Your Cosmic Journey</span>
                    <h2 className="landing-form-heading-title" style={{ fontSize: '18px' }}>
                      {authMode === 'login' ? 'Access Trikal' : 'Begin Journey'}
                    </h2>
                  </header>
                  {renderAuthForm()}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Centered layout for logged in users */}
              <div className="landing-emblem animate-up" aria-hidden="true">
                <span
                  className="material-symbols-outlined landing-emblem-icon"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                <span className="landing-emblem-ring" />
                <span className="landing-emblem-ring landing-emblem-ring-2" />
              </div>

              <h1 className="landing-wordmark animate-up delay-1">
                Trikal Darshi
              </h1>

              <p className="landing-tagline animate-up delay-2">
                Vedic Jyotish · Lal Kitab · Numerology
              </p>

              <div className="landing-badge-row animate-up delay-3" aria-label="Key features">
                {['10+ Life Sections', 'AI Streaming', 'Remedy Tripath'].map((b) => (
                  <span key={b} className="landing-badge">{b}</span>
                ))}
              </div>

              <button
                id="heroScrollBtn"
                onClick={scrollToForm}
                className="landing-cta animate-up delay-4"
                aria-label="Scroll down to birth entry form"
              >
                <span>Begin Your Reading</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  arrow_downward
                </span>
              </button>
            </>
          )}
        </div>

        {/* Bouncing scroll dot */}
        <div className="landing-scroll-indicator" aria-hidden="true">
          <span className="landing-scroll-dot" />
        </div>

      </section>

      {/* ════════════════════════════════════════════════════════════
           FEATURE STRIP
         ════════════════════════════════════════════════════════════ */}
      <section className="landing-feature-strip" aria-label="Platform features">
        <div className="landing-section-inner">

          {/* Section heading */}
          <div className="feature-section-heading" data-reveal>
            <span className="feature-section-kicker">What We Offer</span>
            <h2 className="feature-section-title">
              Ancient Science, Modern Intelligence
            </h2>
          </div>

          <div className="landing-feature-grid">
            {FEATURES.map((f, i) => (
              <div
                key={f.id}
                className="landing-feature-card animate-up"
                data-reveal
                data-delay={String(i + 1)}
              >
                <span
                  className="material-symbols-outlined landing-feature-icon"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {f.icon}
                </span>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
           BIRTH FORM SECTION
         ════════════════════════════════════════════════════════════ */}
      {user && (
        <section
          ref={formRef}
          className="landing-form-section"
          id="birthFormSection"
          aria-label="Birth details form"
        >
          <div className="landing-section-inner landing-section-narrow">

            {/* Heading above form */}
            <header className="landing-form-heading animate-up" data-reveal>
              <span className="landing-form-heading-kicker">Your Cosmic Blueprint</span>
              <h2 className="landing-form-heading-title">Enter Your Birth Details</h2>
              <p className="landing-form-heading-sub">
                Precise birth data unlocks the most accurate planetary interpretations.
              </p>
            </header>

            {/* Form card */}
            <div className="blueprint-card animate-up" data-reveal data-delay="1">

              {/* Error banner */}
              {error && (
                <div className="mb-6 flex items-start gap-3 bg-error/8 border border-error/25 rounded-xl p-4 text-sm text-error font-medium">
                  <span
                    className="material-symbols-outlined text-[18px] shrink-0 mt-0.5"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    error
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {loading ? (
                /* ── Loading state ──────────────────────────────────── */
                <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-container text-[40px] animate-spin">
                      progress_activity
                    </span>
                    <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-headline-md text-primary text-lg tracking-wide">
                      Calculating your destiny…
                    </h3>
                    <p className="text-on-surface-variant text-sm font-accent-italic italic">
                      Aligning planetary houses, dashas &amp; numerology matrix
                    </p>
                  </div>
                </div>
              ) : (
                /* ── Input Form & Saved Charts list ── */
                <div>
                  {/* Saved Blueprints List (if user has any) */}
                  {userCharts.length > 0 && (
                    <div className="saved-blueprints-container">
                      <h3 className="saved-blueprints-title">Your Saved Cosmic Blueprints</h3>
                      <div className="saved-blueprints-grid animate-up">
                        {userCharts.map((chart) => (
                          <div
                            key={chart.chart_id}
                            onClick={() => navigate(`/dashboard/${chart.chart_id}`)}
                            className="saved-blueprint-card"
                          >
                            <div className="saved-blueprint-info">
                              <span className="saved-blueprint-name">{chart.full_name}</span>
                              <span className="saved-blueprint-meta">
                                {chart.date_of_birth} · {chart.city_of_birth}
                              </span>
                            </div>
                            <span className="material-symbols-outlined text-[18px] text-primary/70">
                              arrow_forward
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 my-6">
                        <div className="h-px bg-outline-variant/30 flex-1" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-outline/40">OR CREATE A NEW ONE</span>
                        <div className="h-px bg-outline-variant/30 flex-1" />
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
      <footer className="landing-footer">
        <div className="landing-footer-divider" aria-hidden="true">
          <div className="landing-footer-line" />
          <span className="landing-footer-diamond">✦</span>
          <div className="landing-footer-line" />
        </div>
        <div className="landing-section-inner landing-footer-inner">
          <div className="flex items-center gap-3 text-outline/40 text-[10px] font-semibold uppercase tracking-widest">
            {['Vedic Jyotish', 'Lal Kitab', 'Numerology'].map((item, i) => (
              <React.Fragment key={item}>
                {i > 0 && <span className="w-1 h-1 bg-outline-variant/50 rounded-full" />}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </div>
          <p className="text-outline/25 text-xs mt-2">
            © 2024 TRIKAL DARSHI · Ancient Wisdom, Modern Precision
          </p>
        </div>
      </footer>

    </div>
  );
}
