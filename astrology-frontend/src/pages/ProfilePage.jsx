import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { generateChart } from '../services/api';
import KundaliChart from '../components/KundaliChart';
import AuthModal from '../components/AuthModal';
import { CalculationMilestones } from '../components/StatusBanners';

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

function formatDegree(deg) {
  const n = Number(deg);
  if (!Number.isFinite(n) || n <= 0) return null;
  const whole = Math.floor(n);
  const minutes = Math.round((n - whole) * 60);
  const signIdx = Math.floor(n / 30) % 12;
  return `${whole}°${String(minutes).padStart(2, '0')}' ${ZODIAC_SIGNS[signIdx]}`;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    time_of_birth: '',
    birth_time_confidence: 'exact',
    city_of_birth: '',
    current_city: '',
    language: 'english',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [castChart, setCastChart] = useState(null); // last generated chart object

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] font-['Inter',sans-serif] text-[#16223F] flex items-center justify-center p-4">
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="login" />
        <div className="relative w-full max-w-md bg-[#FFFDF6] border-2 border-[#D9A63C]/50 rounded-3xl shadow-2xl p-8 text-center">
          <div aria-hidden="true" className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#D9A63C]" />
          <div aria-hidden="true" className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-[#D9A63C]" />
          <div aria-hidden="true" className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-[#D9A63C]" />
          <div aria-hidden="true" className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#D9A63C]" />
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1F3A6B] text-[#F0DFAF] border border-[#D9A63C]/40 shadow-md mb-3">
            <span className="material-symbols-outlined text-[28px]">lock_person</span>
          </div>
          <h1 className="font-['Fraunces',serif] text-2xl font-bold text-[#022454] tracking-tight mb-1">
            Your Vedic Profile
          </h1>
          <p className="text-sm text-[#5D6B88] leading-relaxed mb-6">
            Sign in or create a Scholar Profile to keep your Janma Kundali, dashas, and
            reading archive in one private vault.
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="w-full py-3 px-4 bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] text-xs font-semibold rounded-xl border border-[#D9A63C] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">auto_awesome</span>
              <span>Sign In / Create Profile</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2.5 px-4 bg-[#F4EEDA] hover:bg-[#EAE2C8] text-[#16223F] text-xs font-semibold rounded-xl border border-[#D9A63C]/40 transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCast = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.date_of_birth || !formData.time_of_birth || !formData.city_of_birth) {
      setError('Please fill in all required birth parameters marked with *');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const result = await generateChart({ ...formData, full_name: formData.full_name || user?.name });
      if (!result?.chart_id) {
        throw new Error('Calculations completed but no Chart ID was returned.');
      }
      setCastChart(result);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'An error occurred during calculations.');
    } finally {
      setGenerating(false);
    }
  };

  const asc = castChart?.ascendant || {};
  const ascSign = asc?.sign || castChart?.lagna || null;
  const ascDegree = formatDegree(asc?.degree ?? asc?.fullDegree ?? asc?.full_degree ?? castChart?.lagna_degree);
  const moonPlanet = (castChart?.planets || []).find((p) => p?.name === 'Moon');
  const nakshatra = castChart?.moon_nakshatra || moonPlanet?.nakshatra || null;
  const dasha = castChart?.current_dasha?.mahadasha || castChart?.current_dasha || null;

  return (
    <div className="bg-[#FBF6EA] font-['Inter',sans-serif] text-[#16223F] antialiased selection:bg-[#F0DFAF] selection:text-[#022454] min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#FBF6EA]/90 backdrop-blur border-b border-[#D9A63C]/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/charts')}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1F3A6B] hover:text-[#022454] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Vault</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#D9A63C]">auto_awesome</span>
            <span className="font-['Fraunces',serif] font-bold text-[#022454] tracking-tight text-sm sm:text-base">
              Trikal Darshi
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold rounded-lg border border-red-200 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Identity card ──────────────────────────────────────────── */}
        <section className="relative mb-8 bg-[#FFFDF6] border-2 border-[#D9A63C]/40 rounded-3xl shadow-md p-6 sm:p-7 overflow-hidden">
          <div aria-hidden="true" className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#D9A63C]" />
          <div aria-hidden="true" className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-[#D9A63C]" />
          <div aria-hidden="true" className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-[#D9A63C]" />
          <div aria-hidden="true" className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#D9A63C]" />

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#1F3A6B] text-[#F0DFAF] border border-[#D9A63C]/40 shadow-md flex items-center justify-center text-2xl font-bold font-['Fraunces',serif] flex-shrink-0">
              {(user?.name || user?.email || 'N').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-['Fraunces',serif] text-2xl font-bold text-[#022454] tracking-tight truncate">
                  {user?.name || 'Vedic Native'}
                </h1>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                  Authenticated
                </span>
              </div>
              <p className="text-xs text-[#5D6B88] font-mono mt-1 truncate">{user?.email}</p>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-[#4A567A] flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-[#D9A63C]">translate</span>
                  <span className="capitalize">{user?.preferred_language || 'English'}</span>
                </span>
                <span className="flex items-center gap-1 font-mono text-[#8C6718]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D9A63C]" />
                  Lahiri Ayanamsa · D1–D60 Vargas
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ── Janma Kundali Generator ──────────────────────────────── */}
          <section className="relative bg-[#FFFDF6] border-2 border-[#D9A63C]/40 rounded-3xl shadow-md p-6 sm:p-7 overflow-hidden">
            <div aria-hidden="true" className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#D9A63C]" />
            <div aria-hidden="true" className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-[#D9A63C]" />
            <div aria-hidden="true" className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-[#D9A63C]" />
            <div aria-hidden="true" className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#D9A63C]" />

            <div className="flex flex-col gap-1.5 pb-5 border-b border-[#EAE3D2]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#D9A63C]">auto_awesome</span>
                <span className="text-[12px] uppercase tracking-widest text-[#7b5800] font-bold">
                  Janma Kundali Generator
                </span>
              </div>
              <h2 className="font-['Fraunces',serif] text-2xl font-bold text-[#022454] tracking-tight">
                Cast From Your Profile
              </h2>
              <p className="text-[13px] text-[#4A567A] leading-relaxed">
                Compute exact ascendant degrees, nakshatra pada, and planetary vargas — every
                chart is archived to your vault automatically.
              </p>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-[#FFDAD6] border border-[#BA1A1A]/30 text-[#93000A] text-xs rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {generating && (
              <div className="mt-4">
                <CalculationMilestones />
              </div>
            )}

            <form onSubmit={handleCast} className="flex flex-col gap-4 pt-5">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#16223F] font-semibold" htmlFor="profile_full_name">
                  Full Name <span className="text-[#7b5800]">*</span>
                </label>
                <input
                  id="profile_full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder={user?.name || 'e.g. Rahul Sharma'}
                  className="w-full h-11 px-3.5 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] placeholder-[#4A567A]/60 text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-[#16223F] font-semibold" htmlFor="profile_dob">
                    Date of Birth <span className="text-[#7b5800]">*</span>
                  </label>
                  <input
                    id="profile_dob"
                    name="date_of_birth"
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="w-full h-11 px-3.5 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-[#16223F] font-semibold" htmlFor="profile_tob">
                    Time of Birth <span className="text-[#7b5800]">*</span>
                  </label>
                  <input
                    id="profile_tob"
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
              </div>

              {/* Place of Birth */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#16223F] font-semibold" htmlFor="profile_city">
                  Place of Birth <span className="text-[#7b5800]">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="profile_city"
                    name="city_of_birth"
                    type="text"
                    required
                    value={formData.city_of_birth}
                    onChange={handleChange}
                    placeholder="e.g. Varanasi, India"
                    className="w-full h-11 pl-3.5 pr-10 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] placeholder-[#4A567A]/60 text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                  />
                  <span className="material-symbols-outlined absolute right-3 text-[20px] text-[#D9A63C] pointer-events-none">
                    location_on
                  </span>
                </div>
              </div>

              {/* Current City */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#16223F] font-semibold" htmlFor="profile_current_city">
                  Current City (for Gochara Transits)
                </label>
                <div className="relative flex items-center">
                  <input
                    id="profile_current_city"
                    name="current_city"
                    type="text"
                    value={formData.current_city}
                    onChange={handleChange}
                    placeholder="e.g. Bengaluru, India"
                    className="w-full h-11 pl-3.5 pr-10 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] placeholder-[#4A567A]/60 text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                  />
                  <span className="material-symbols-outlined absolute right-3 text-[20px] text-[#4A567A] pointer-events-none">
                    my_location
                  </span>
                </div>
              </div>

              {/* Language */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#16223F] font-semibold" htmlFor="profile_language">
                  Interpretation Language
                </label>
                <div className="relative flex items-center">
                  <select
                    id="profile_language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="w-full h-11 px-3.5 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors appearance-none cursor-pointer"
                  >
                    <option value="english">English (IAST Romanized Diacritics)</option>
                    <option value="hindi">हिन्दी (Devanagari Sanskritised)</option>
                    <option value="bengali">বাংলা (Bengali Traditional Shloka)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 text-[20px] text-[#4A567A] pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full h-12 bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] border-2 border-[#D9A63C] text-base font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-1 cursor-pointer disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    <span>Computing Precision Sidereal Chart…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px] text-[#D9A63C]">auto_awesome</span>
                    <span>Cast Kundali</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* ── Generated chart preview ──────────────────────────────── */}
          <section className="flex flex-col gap-6">
            {castChart ? (
              <>
                <div className="relative bg-[#FFFDF6] border-2 border-[#D9A63C]/40 rounded-3xl shadow-md p-6 sm:p-7 overflow-hidden">
                  <div aria-hidden="true" className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#D9A63C]" />
                  <div aria-hidden="true" className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-[#D9A63C]" />
                  <div aria-hidden="true" className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-[#D9A63C]" />
                  <div aria-hidden="true" className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#D9A63C]" />

                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#EAE3D2] mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#D9A63C]">stars</span>
                        <span className="text-[12px] uppercase tracking-widest text-[#7b5800] font-bold">
                          Lagna Kundali · D1
                        </span>
                      </div>
                      <h3 className="font-['Fraunces',serif] text-xl font-bold text-[#022454] tracking-tight mt-1">
                        {castChart.full_name}
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-[#FBF5E5] border border-[#E0CF9B] text-[#7b5800] font-mono text-[10px] font-bold whitespace-nowrap">
                      SAVED TO VAULT ✓
                    </span>
                  </div>

                  <KundaliChart chartData={castChart} />

                  {/* Quick facts */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-3 bg-[#FBF6EA] border border-[#D9A63C]/30 rounded-xl">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#8C6718] mb-1">Ascendant</div>
                      <div className="text-sm font-semibold text-[#16223F]">
                        {ascDegree || ascSign || '—'}
                      </div>
                      {ascDegree && ascSign && (
                        <div className="text-[11px] text-[#5D6B88] mt-0.5">{ascSign} Lagna</div>
                      )}
                    </div>
                    <div className="p-3 bg-[#FBF6EA] border border-[#D9A63C]/30 rounded-xl">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#8C6718] mb-1">Moon Sign</div>
                      <div className="text-sm font-semibold text-[#16223F]">{moonPlanet?.sign || '—'}</div>
                      {nakshatra && (
                        <div className="text-[11px] text-[#5D6B88] mt-0.5">{nakshatra}</div>
                      )}
                    </div>
                    <div className="p-3 bg-[#FBF6EA] border border-[#D9A63C]/30 rounded-xl col-span-2">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#8C6718] mb-1">Current Dasha</div>
                      <div className="text-sm font-semibold text-[#16223F]">
                        {typeof dasha === 'string' ? dasha : dasha?.dashanama || '—'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/${castChart.chart_id}`)}
                    className="w-full mt-5 py-3 px-4 bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] text-xs font-semibold rounded-xl border border-[#D9A63C] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">workspace_premium</span>
                    <span>Open Full 11-Chapter Reading</span>
                    <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">arrow_forward</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="relative bg-[#FFFDF6] border-2 border-dashed border-[#D9A63C]/40 rounded-3xl shadow-sm p-8 text-center overflow-hidden">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F4EEDA] text-[#8C6718] border border-[#D9A63C]/40 mb-3">
                  <span className="material-symbols-outlined text-[28px]">brightness_7</span>
                </div>
                <h3 className="font-['Fraunces',serif] text-lg font-bold text-[#022454] tracking-tight mb-1">
                  Your Kundali Appears Here
                </h3>
                <p className="text-[13px] text-[#4A567A] leading-relaxed max-w-sm mx-auto">
                  Cast a chart with the generator and the North Indian Lagna Kundali, ascendant
                  degree, moon sign, and current dasha will render on this panel instantly — then
                  dive into the full 11-chapter AI reading.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/charts')}
                  className="mt-5 inline-flex items-center gap-1.5 py-2.5 px-4 bg-[#F4EEDA] hover:bg-[#EAE2C8] text-[#16223F] text-xs font-semibold rounded-xl border border-[#D9A63C]/40 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#8C6718]">folder_special</span>
                  <span>Or Browse Your Saved Vault</span>
                </button>
              </div>
            )}

            {/* Vault shortcut card */}
            <div className="bg-[#F4EEDA] border border-[#D9A63C]/40 rounded-3xl p-5 flex items-center justify-between gap-4">
              <div>
                <div className="font-['Fraunces',serif] font-bold text-[#022454] text-sm">Reading Archive</div>
                <div className="text-[11px] text-[#4A567A] mt-0.5">
                  Every cast chart is stored in your private vault with all interpretations.
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/charts')}
                className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3.5 bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] text-[11px] font-semibold rounded-xl border border-[#D9A63C]/40 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">folder_special</span>
                <span>Vault</span>
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
