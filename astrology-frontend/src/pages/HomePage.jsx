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
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.full_name || !formData.date_of_birth || !formData.time_of_birth || !formData.city_of_birth) {
        throw new Error('Please fill in all required birth parameters.');
      }

      const result = await generateChart(formData);
      if (result && result.chart_id) {
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
    <div className="flex flex-col items-center justify-center font-body-md text-on-background px-4 min-h-screen">
      <main className="w-full max-w-[520px] py-12 flex flex-col items-center space-y-10 animate-up">
        {/* Hero Section */}
        <header className="flex flex-col items-center text-center space-y-4">
          <div className="relative w-16 h-16 flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            <div className="absolute inset-0 border border-primary/20 rounded-full animate-pulse"></div>
          </div>
          <h1 className="font-wordmark text-[32px] text-primary-container tracking-[0.2em] uppercase">
            TRIKAL DARSHI
          </h1>
          <p className="font-accent-italic italic text-secondary text-lg">
            Vedic Jyotish • Lal Kitab • Numerology
          </p>
        </header>

        {/* Form Card */}
        <section className="blueprint-card">
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg text-error p-4 text-sm text-center mb-6 font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
              <div className="relative w-16 h-16 flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[48px] animate-spin">
                  progress_activity
                </span>
                <div className="absolute inset-0 border border-primary/20 rounded-full animate-ping"></div>
              </div>
              <div className="space-y-2">
                <h3 className="font-headline-md text-primary text-xl">Calculating your destiny...</h3>
                <p className="text-secondary text-sm font-accent-italic italic">
                  Aligning houses, transits, and numerology matrices
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="blueprint-form" id="birthForm">
              {/* Full Name */}
              <div className="blueprint-form-group">
                <label className="blueprint-label">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  className="blueprint-input"
                />
              </div>

              {/* Date of Birth */}
              <div className="blueprint-form-group">
                <label className="blueprint-label">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                  className="blueprint-input"
                />
              </div>

              {/* Time of Birth & Confidence */}
              <div className="blueprint-form-group">
                <label className="blueprint-label">
                  Time of Birth *
                </label>
                <input
                  type="time"
                  name="time_of_birth"
                  value={formData.time_of_birth}
                  onChange={handleChange}
                  required
                  className="blueprint-input"
                />
                <div className="blueprint-pill-container">
                  {['exact', 'approximate', 'unknown'].map((val) => {
                    const isActive = formData.birth_time_confidence === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, birth_time_confidence: val }))
                        }
                        className={`blueprint-pill ${isActive ? 'active' : ''}`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* City of Birth */}
              <div className="blueprint-form-group">
                <label className="blueprint-label">
                  City of Birth *
                </label>
                <div className="blueprint-input-row">
                  <span className="material-symbols-outlined text-outline mr-2 text-[20px]">
                    location_on
                  </span>
                  <input
                    type="text"
                    name="city_of_birth"
                    value={formData.city_of_birth}
                    onChange={handleChange}
                    placeholder="Search birthplace"
                    required
                    className="blueprint-input"
                  />
                </div>
              </div>

              {/* Current City (Optional) */}
              <div className="blueprint-form-group">
                <label className="blueprint-label">
                  Current City (Optional)
                </label>
                <div className="blueprint-input-row">
                  <span className="material-symbols-outlined text-outline mr-2 text-[20px]">
                    my_location
                  </span>
                  <input
                    type="text"
                    name="current_city"
                    value={formData.current_city}
                    onChange={handleChange}
                    placeholder="e.g. Mumbai, Maharashtra"
                    className="blueprint-input"
                  />
                </div>
              </div>

              {/* Sacred Divider */}
              <div className="relative flex items-center justify-center py-2">
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-outline-variant/40 to-transparent"></div>
                <div className="absolute w-2 h-2 bg-primary-container rounded-sm rotate-45 border border-primary/20"></div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="blueprint-button shimmer-button"
              >
                GENERATE MY COSMIC BLUEPRINT <span className="material-symbols-outlined text-sm">flare</span>
              </button>
            </form>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center">
          <div className="flex items-center justify-center gap-4 text-outline/60 font-label-sm tracking-widest uppercase text-[10px] font-semibold">
            <span className="flex items-center gap-1">
              <span
                className="material-symbols-outlined text-[10px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>{' '}
              Vedic Jyotish
            </span>
            <span className="w-1 h-1 bg-outline-variant/50 rounded-full"></span>
            <span className="flex items-center gap-1">
              <span
                className="material-symbols-outlined text-[10px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>{' '}
              Lal Kitab
            </span>
            <span className="w-1 h-1 bg-outline-variant/50 rounded-full"></span>
            <span className="flex items-center gap-1">
              <span
                className="material-symbols-outlined text-[10px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>{' '}
              Numerology
            </span>
          </div>
          <p className="mt-8 text-outline/30 font-body-md text-xs">
            © 2024 TRIKAL DARSHI - Ancient Wisdom, Modern Precision
          </p>
        </footer>
      </main>
    </div>
  );
}
