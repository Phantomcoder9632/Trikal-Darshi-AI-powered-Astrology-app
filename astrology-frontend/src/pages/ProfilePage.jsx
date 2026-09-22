import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserCharts, deleteChart, generateChart } from '../services/api';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import AuthModal from '../components/AuthModal';
import { CalculationMilestones } from '../components/StatusBanners';

/**
 * ProfilePage — the single account hub.
 *
 * Layout: AppHeader → Identity card → Action buttons → My Charts
 * (search + filter + list with inline delete confirmation) → AppFooter.
 *
 * The Janma Kundali Generator lives in a floating modal, opened by
 * "Calculate New Kundali". All vault logic was migrated from the removed
 * SavedChartsPage (/charts now redirects here).
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  // ── Auth gate (guests see a sign-in card + modal) ─────────────────────
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ── Vault state (migrated from SavedChartsPage) ───────────────────────
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all | family | prashna
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  const loadCharts = useCallback(async () => {
    if (!isAuthenticated) {
      setCharts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getUserCharts();
      setCharts(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch (err) {
      console.error('Failed to load user charts:', err);
      setCharts([]);
      setLoadError(
        err.response?.data?.detail ||
          'Could not reach the astrological calculation server. Your saved charts could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  const flashNotice = (type, msg) => {
    setStatusNotice({ type, msg });
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // ── Delete chart with inline confirmation popover ─────────────────────
  const handleDelete = async (chartId) => {
    setIsDeleting(true);
    try {
      await deleteChart(chartId);
      setCharts((prev) => prev.filter((c) => (c.chart_id || c.id) !== chartId));
      setDeletingId(null);
      flashNotice('success', 'Ephemeris chart deleted from vault.');
    } catch (err) {
      console.error('Delete chart error:', err);
      flashNotice('error', 'Could not delete chart. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Export JSON ────────────────────────────────────────────────────────
  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(charts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `trikal_darshi_vault_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    flashNotice('info', 'Vault JSON export downloaded.');
  };

  // ── Kundali Generator modal (floating) ────────────────────────────────
  const [showKundaliModal, setShowKundaliModal] = useState(false);
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
  const [castError, setCastError] = useState('');

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCast = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.date_of_birth || !formData.time_of_birth || !formData.city_of_birth) {
      setCastError('Please fill in all required birth parameters marked with *');
      return;
    }
    setGenerating(true);
    setCastError('');
    try {
      const result = await generateChart({ ...formData, full_name: formData.full_name || user?.name });
      if (!result?.chart_id) {
        throw new Error('Calculations completed but no Chart ID was returned.');
      }
      setShowKundaliModal(false);
      flashNotice('success', `Chart for ${result.full_name || 'the native'} cast — opening the reading…`);
      navigate(`/dashboard/${result.chart_id}`);
    } catch (err) {
      console.error(err);
      setCastError(err.response?.data?.detail || err.message || 'An error occurred during calculations.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Filter logic (migrated) ───────────────────────────────────────────
  const filteredCharts = charts.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city_of_birth?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lagna?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.moon_nakshatra?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (activeFilter === 'family') {
      return (
        c.category === 'family' ||
        c.relationship === 'Self (Primary)' ||
        c.relationship === 'Spouse' ||
        c.relationship === 'Father' ||
        c.relationship === 'Daughter'
      );
    }
    if (activeFilter === 'prashna') {
      return c.category === 'prashna' || c.birth_time_confidence === 'unknown';
    }
    return true;
  });

  // ── Guest gate ─────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="bg-[#FBF6EA] font-['Inter',sans-serif] text-[#16223F] min-h-screen flex flex-col">
        <AppHeader variant="app" onRequireAuth={() => setShowAuthModal(true)} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode="login" />
        <main className="flex-1 flex items-center justify-center p-4 pt-24">
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
        </main>
        <AppFooter />
      </div>
    );
  }

  // ── Authenticated profile ───────────────────────────────────────────────
  return (
    <div className="bg-[#FBF6EA] font-['Inter',sans-serif] text-[#16223F] antialiased selection:bg-[#F0DFAF] selection:text-[#022454] min-h-screen flex flex-col">
      <AppHeader variant="app" />

      {/* Toast */}
      {statusNotice && (
        <div className="fixed top-20 right-6 z-50">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              statusNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : statusNotice.type === 'error'
                ? 'bg-red-50 border-red-300 text-red-900'
                : 'bg-blue-50 border-blue-300 text-blue-900'
            }`}
          >
            <span>{statusNotice.type === 'success' ? '✓' : statusNotice.type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <span>{statusNotice.msg}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* ── IDENTITY CARD ─────────────────────────────────────────────── */}
        <section className="relative mb-6 bg-[#FFFDF6] border-2 border-[#D9A63C]/40 rounded-3xl shadow-md p-6 sm:p-7 overflow-hidden">
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

            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold rounded-xl border border-red-200 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── ACTION BUTTONS ────────────────────────────────────────────── */}
        <section className="flex flex-wrap items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => {
              setCastError('');
              setShowKundaliModal(true);
            }}
            className="inline-flex items-center gap-2 bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] font-semibold text-sm px-5 py-2.5 rounded-xl shadow-md border border-[#D9A63C]/50 transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            <span className="text-[#D9A63C]">✦</span>
            <span>Calculate New Kundali</span>
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            disabled={charts.length === 0}
            className="inline-flex items-center gap-2 bg-[#FFFDF6] hover:bg-[#FBF5E5] text-[#16223F] font-semibold text-sm px-5 py-2.5 rounded-xl border border-[#D9A63C]/40 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={charts.length === 0 ? 'No charts to export yet' : 'Download all vault charts as JSON'}
          >
            <span className="material-symbols-outlined text-[16px] text-[#8C6718]">file_download</span>
            <span>Export All JSON</span>
          </button>
        </section>

        {/* ── MY CHARTS ─────────────────────────────────────────────────── */}
        <section className="mb-4">
          <div className="flex items-center space-x-2 text-xs font-mono tracking-widest uppercase text-[#8C6718] mb-2 font-medium">
            <span>✦ Janma Kundali Vault</span>
            <span>•</span>
            <span>Secure Ephemeris Archive</span>
          </div>
          <h2 className="font-['Fraunces',serif] text-2xl md:text-3xl font-semibold tracking-tight text-[#16223F]">
            My Charts
          </h2>
        </section>

        {/* Search + filter controls */}
        <section className="bg-[#FFFDF6] border border-[#D9A63C]/30 rounded-2xl p-4 shadow-xs mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative min-w-[240px] max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8E9BB5]">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by native name, city, lagna..."
                className="w-full pl-9 pr-4 py-2 bg-[#FBF6EA] border border-[#D9A63C]/30 rounded-xl text-xs sm:text-sm text-[#16223F] placeholder-[#8E9BB5] focus:ring-1 focus:ring-[#D9A63C] focus:border-[#D9A63C] outline-hidden"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: 'all', label: `All Charts (${charts.length})` },
                {
                  key: 'family',
                  label: `Direct Family (${charts.filter((c) => c.relationship || c.category === 'family').length})`,
                },
                {
                  key: 'prashna',
                  label: `Horary / Prashna (${charts.filter((c) => c.category === 'prashna' || c.birth_time_confidence === 'unknown').length})`,
                },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    activeFilter === f.key
                      ? 'bg-[#1F3A6B] text-[#F0DFAF] shadow-xs'
                      : 'bg-[#FBF6EA] hover:bg-[#F4EEDA] text-[#5D6B88] border border-[#D9A63C]/30'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center space-x-2.5 bg-[#FBF6EA] border border-[#D9A63C]/40 px-3.5 py-2 rounded-xl text-xs font-mono text-[#5D6B88]">
            <div className="w-2 h-2 rounded-full bg-[#D9A63C] animate-pulse" />
            <span className="text-[#16223F] font-semibold">{charts.length} / 50</span>
            <span>Cloud Ephemerides Stored</span>
            <span className="text-[#D9A63C]">•</span>
            <span className="text-[#8C6718]">Sidereal Lahiri Active</span>
          </div>
        </section>

        {/* Chart list */}
        <div className="space-y-4">
          {loadError && !loading && (
            <div className="bg-[#FFF4F2] border border-[#BA1A1A]/30 rounded-2xl p-6 text-center">
              <span className="material-symbols-outlined text-[36px] text-[#BA1A1A] mb-2">cloud_off</span>
              <h3 className="font-['Fraunces',serif] text-lg font-bold text-[#93000A]">Connection Issue</h3>
              <p className="text-xs text-[#93000A]/90 max-w-md mx-auto mt-1 mb-4">{loadError}</p>
              <button
                type="button"
                onClick={loadCharts}
                className="inline-flex items-center gap-2 bg-[#BA1A1A] hover:bg-[#93000A] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {!loading && !loadError && charts.length === 0 && (
            <div className="bg-[#FFFDF6] border border-[#D9A63C]/30 rounded-2xl p-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-[#D9A63C] mb-3">auto_stories</span>
              <h3 className="font-['Fraunces',serif] text-lg font-bold text-[#16223F]">No Saved Charts Yet</h3>
              <p className="text-xs text-[#5D6B88] max-w-sm mx-auto mt-1 mb-5">
                You have not created any birth charts yet. Cast your first Janma Kundali to archive it in your vault.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCastError('');
                  setShowKundaliModal(true);
                }}
                className="inline-flex items-center gap-2 bg-[#1F3A6B] text-[#F0DFAF] text-xs font-semibold px-5 py-2.5 rounded-xl border border-[#D9A63C]/40 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">add_circle</span>
                <span>Create Your Birth Chart</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-[#FFFDF6] border border-[#D9A63C]/30 rounded-2xl p-12 text-center">
              <span className="material-symbols-outlined text-[36px] text-[#D9A63C] animate-spin mb-3">
                progress_activity
              </span>
              <p className="text-sm font-medium text-[#16223F]">Loading your saved natal ephemeris vault...</p>
            </div>
          ) : filteredCharts.length === 0 && charts.length > 0 ? (
            <div className="bg-[#FFFDF6] border border-[#D9A63C]/30 rounded-2xl p-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-[#D9A63C] mb-3">auto_stories</span>
              <h3 className="font-['Fraunces',serif] text-lg font-bold text-[#16223F]">No Charts Found</h3>
              <p className="text-xs text-[#5D6B88] max-w-sm mx-auto mt-1 mb-4">
                No charts match your current filter. Adjust the search or filter to see your vault.
              </p>
            </div>
          ) : (
            filteredCharts.map((chart, idx) => {
              const chartId = chart.chart_id || chart.id || `chart-${idx}`;
              const isPrimary = idx === 0 || chart.relationship === 'Self (Primary)';
              const isDeleteOpen = deletingId === chartId;

              return (
                <article
                  key={chartId}
                  className={`bg-[#FFFDF6] border rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-visible ${
                    isPrimary ? 'border-[#D9A63C]/40' : 'border-[#D9A63C]/30'
                  }`}
                >
                  {isPrimary && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#D9A63C]" />}

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pl-2">
                    {/* Native identity + thumbnail */}
                    <div className="flex items-start space-x-4 min-w-[280px]">
                      <div className="w-14 h-14 flex-shrink-0 bg-[#FBF6EA] border border-[#D9A63C]/50 rounded-xl p-1 shadow-inner relative flex items-center justify-center">
                        <svg className="w-full h-full stroke-[#1F3A6B] stroke-[1.5] fill-none" viewBox="0 0 100 100">
                          <rect height="96" width="96" x="2" y="2" />
                          <line x1="2" x2="98" y1="2" y2="98" />
                          <line x1="98" x2="2" y1="2" y2="98" />
                          <polygon points="50,2 98,50 50,98 2,50" />
                        </svg>
                        <span className="absolute text-[8px] font-mono font-bold text-[#8C6718] bg-[#FFFDF6] px-0.5 rounded border border-[#D9A63C]/40">
                          D1
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                          <h3 className="font-['Fraunces',serif] font-bold text-lg text-[#16223F] leading-snug">
                            {chart.full_name || 'Vedic Native'}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isPrimary
                                ? 'bg-[#F0DFAF] text-[#12244A] border-[#D9A63C]/40'
                                : 'bg-[#E8EFFB] text-[#1F3A6B] border-[#1F3A6B]/20'
                            }`}
                          >
                            {chart.relationship || (isPrimary ? 'Self (Primary)' : 'Self')}
                          </span>
                        </div>
                        <p className="text-xs text-[#5D6B88] font-mono mt-1 flex items-center space-x-1.5 flex-wrap">
                          <span>{chart.date_of_birth || '—'}</span>
                          <span>•</span>
                          <span>{chart.time_of_birth || '—'}</span>
                          <span>•</span>
                          <span>{chart.city_of_birth || '—'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Astrological key vectors */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 flex-1 bg-[#FBF6EA]/70 p-3 rounded-xl border border-[#D9A63C]/20 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase font-mono tracking-wider text-[#8E9BB5]">
                          Lagna (Ascendant)
                        </span>
                        <span className="font-medium text-[#16223F] mt-0.5 block truncate">{chart.lagna || '—'}</span>
                        <span className="font-mono text-[11px] text-[#8C6718]">{chart.lagna_degree || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-mono tracking-wider text-[#8E9BB5]">
                          Moon Nakshatra
                        </span>
                        <span className="font-medium text-[#16223F] mt-0.5 block truncate">
                          {chart.moon_nakshatra || '—'}
                        </span>
                        <span className="font-mono text-[11px] text-[#8C6718]">{chart.moon_degree || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-mono tracking-wider text-[#8E9BB5]">
                          Atmakaraka
                        </span>
                        <span className="font-medium text-[#16223F] mt-0.5 block truncate">{chart.atmakaraka || '—'}</span>
                        <span className="font-mono text-[11px] text-[#5D6B88]">Jaimini Karaka</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-mono tracking-wider text-[#8E9BB5]">
                          Active Mahadasha
                        </span>
                        <span className="font-medium text-[#1F3A6B] mt-0.5 block font-semibold truncate">
                          {chart.active_mahadasha || '—'}
                        </span>
                        <span className="font-mono text-[11px] text-emerald-700">Vimshottari Period</span>
                      </div>
                    </div>

                    {/* Actions + delete confirmation popover */}
                    <div className="relative flex items-center space-x-2.5 flex-shrink-0 self-end lg:self-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/${chartId}`)}
                        className="inline-flex items-center space-x-1.5 bg-[#1F3A6B] hover:bg-[#152A50] text-[#F0DFAF] text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer border border-[#D9A63C]/30"
                      >
                        <span>Open in Dashboard</span>
                        <span>➔</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingId(isDeleteOpen ? null : chartId)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                          isDeleteOpen
                            ? 'text-red-600 bg-red-100 border-red-300'
                            : 'text-[#8E9BB5] hover:text-red-700 hover:bg-red-50 border-transparent hover:border-red-200'
                        }`}
                        title="Delete record from vault"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>

                      {isDeleteOpen && (
                        <div className="absolute right-0 top-12 z-30 w-72 bg-[#FFFDF6] border border-red-300 rounded-xl shadow-xl p-3.5 text-xs text-[#16223F]">
                          <div className="flex items-start space-x-2">
                            <span className="text-red-600 font-bold text-base leading-none">⚠️</span>
                            <div>
                              <p className="font-semibold text-[#16223F]">Delete {chart.full_name}'s Chart?</p>
                              <p className="text-[11px] text-[#5D6B88] mt-1 leading-normal">
                                This permanently removes the chart, its cached vargas, and all AI interpretations.
                              </p>
                            </div>
                          </div>
                          <div className="mt-3.5 flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              disabled={isDeleting}
                              className="px-2.5 py-1 text-[11px] font-medium text-[#5D6B88] hover:bg-[#F4EEDA] rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(chartId)}
                              disabled={isDeleting}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                            >
                              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>

      {/* ── FLOATING KUNDALI GENERATOR MODAL ──────────────────────────── */}
      {showKundaliModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0E1A37]/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Calculate New Kundali"
        >
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#FFFDF6] border-2 border-[#D9A63C]/60 rounded-3xl shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 bg-[#FFFDF6]/95 backdrop-blur px-6 pt-5 pb-4 border-b border-[#EAE3D2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#D9A63C]">auto_awesome</span>
                <h2 className="font-['Fraunces',serif] text-xl font-bold text-[#022454] tracking-tight">
                  Calculate New Kundali
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowKundaliModal(false)}
                disabled={generating}
                className="w-8 h-8 rounded-lg bg-[#F4EEDA] hover:bg-[#EAE2C8] text-[#4A567A] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="px-6 py-5">
              {castError && (
                <div className="mb-4 p-3 bg-[#FFDAD6] border border-[#BA1A1A]/30 text-[#93000A] text-xs rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{castError}</span>
                </div>
              )}

              {generating && (
                <div className="mb-4">
                  <CalculationMilestones />
                </div>
              )}

              <form onSubmit={handleCast} className="flex flex-col gap-4">
                {/* Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-[#16223F] font-semibold" htmlFor="modal_full_name">
                    Full Name <span className="text-[#7b5800]">*</span>
                  </label>
                  <input
                    id="modal_full_name"
                    name="full_name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={handleFormChange}
                    placeholder={user?.name || 'e.g. Rahul Sharma'}
                    className="w-full h-11 px-3.5 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] placeholder-[#4A567A]/60 text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                  />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-[#16223F] font-semibold" htmlFor="modal_dob">
                      Date of Birth <span className="text-[#7b5800]">*</span>
                    </label>
                    <input
                      id="modal_dob"
                      name="date_of_birth"
                      type="date"
                      required
                      value={formData.date_of_birth}
                      onChange={handleFormChange}
                      className="w-full h-11 px-3.5 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-[#16223F] font-semibold" htmlFor="modal_tob">
                      Time of Birth <span className="text-[#7b5800]">*</span>
                    </label>
                    <input
                      id="modal_tob"
                      name="time_of_birth"
                      type="time"
                      required
                      step="60"
                      value={formData.time_of_birth}
                      onChange={handleFormChange}
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

                {/* Place of Birth + Current City side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-[#16223F] font-semibold" htmlFor="modal_city">
                      Place of Birth <span className="text-[#7b5800]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="modal_city"
                        name="city_of_birth"
                        type="text"
                        required
                        value={formData.city_of_birth}
                        onChange={handleFormChange}
                        placeholder="e.g. Varanasi, India"
                        className="w-full h-11 pl-3.5 pr-10 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] placeholder-[#4A567A]/60 text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                      />
                      <span className="material-symbols-outlined absolute right-3 text-[20px] text-[#D9A63C] pointer-events-none">
                        location_on
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-[#16223F] font-semibold" htmlFor="modal_current_city">
                      Current City
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="modal_current_city"
                        name="current_city"
                        type="text"
                        value={formData.current_city}
                        onChange={handleFormChange}
                        placeholder="e.g. Bengaluru, India"
                        className="w-full h-11 pl-3.5 pr-10 bg-[#FAF8FF] border border-[#DCD5C0] text-[#16223F] placeholder-[#4A567A]/60 text-sm rounded-lg shadow-inner focus:outline-none focus:border-[#1F3A6B] focus:bg-[#FFFDF6] transition-colors"
                      />
                      <span className="material-symbols-outlined absolute right-3 text-[20px] text-[#4A567A] pointer-events-none">
                        my_location
                      </span>
                    </div>
                  </div>
                </div>

                {/* Language */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-[#16223F] font-semibold" htmlFor="modal_language">
                    Interpretation Language
                  </label>
                  <div className="relative flex items-center">
                    <select
                      id="modal_language"
                      name="language"
                      value={formData.language}
                      onChange={handleFormChange}
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
                      <span>Cast Kundali &amp; Begin Reading</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <AppFooter />
    </div>
  );
}
