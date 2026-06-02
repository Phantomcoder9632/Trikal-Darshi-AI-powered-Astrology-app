import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateChart } from '../services/api';

export default function HomePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    time_of_birth: '',
    birth_time_confidence: 'exact',
    city_of_birth: '',
    current_city: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 font-body-md text-on-background">
      <main className="w-full max-w-[480px] flex flex-col items-center gap-8 animate-up">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <header className="flex flex-col items-center text-center gap-3">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-primary-container text-[44px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-40" />
          </div>
          <h1 className="font-wordmark text-[28px] sm:text-[32px] text-primary tracking-[0.18em] uppercase leading-tight">
            Trikal Darshi
          </h1>
          <p className="font-accent-italic italic text-on-surface-variant text-base">
            Vedic Jyotish · Lal Kitab · Numerology
          </p>
        </header>

        {/* ── Form Card ─────────────────────────────────────────── */}
        <section className="blueprint-card w-full">

          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-error/8 border border-error/25 rounded-xl p-4 text-sm text-error font-medium">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            /* ── Loading state ─────────────────────────────────── */
            <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container text-[40px] animate-spin">
                  progress_activity
                </span>
                <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-50" />
              </div>
              <div className="space-y-2">
                <h3 className="font-headline-md text-primary text-lg tracking-wide">Calculating your destiny…</h3>
                <p className="text-on-surface-variant text-sm font-accent-italic italic">
                  Aligning planetary houses, dashas & numerology matrix
                </p>
              </div>
            </div>
          ) : (
            /* ── Input Form ────────────────────────────────────── */
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
                    { value: 'exact',       label: 'Exact'       },
                    { value: 'approximate', label: 'Approximate' },
                    { value: 'unknown',     label: 'Unknown'     },
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

              {/* Current City */}
              <div className="blueprint-form-group">
                <label htmlFor="current_city" className="blueprint-label">Current City <span className="font-normal normal-case opacity-60">(optional)</span></label>
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

              {/* Divider */}
              <div className="relative flex items-center justify-center py-1">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-outline-variant/40 to-transparent" />
                <div className="absolute w-2 h-2 bg-primary-container rounded-sm rotate-45 border border-primary/20" />
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="generateBlueprintBtn"
                className="blueprint-button shimmer-button"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  flare
                </span>
                Generate My Cosmic Blueprint
              </button>
            </form>
          )}
        </section>

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3 text-outline/50 text-[10px] font-semibold uppercase tracking-widest">
            {['Vedic Jyotish', 'Lal Kitab', 'Numerology'].map((item, i) => (
              <React.Fragment key={item}>
                {i > 0 && <span className="w-1 h-1 bg-outline-variant/50 rounded-full" />}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </div>
          <p className="text-outline/30 text-xs">
            © 2024 TRIKAL DARSHI · Ancient Wisdom, Modern Precision
          </p>
        </footer>

      </main>
    </div>
  );
}
