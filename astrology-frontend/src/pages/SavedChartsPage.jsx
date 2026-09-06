import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserCharts, deleteChart } from '../services/api';
import { MOCK_CHARTS_LIST } from '../services/mockData';

export default function SavedChartsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all | family | prashna
  const [deletingId, setDeletingId] = useState(null); // id of chart with open delete popover
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  // Load user charts from backend
  const loadCharts = async () => {
    setLoading(true);
    try {
      const data = await getUserCharts();
      if (Array.isArray(data) && data.length > 0) {
        setCharts(data);
      } else {
        // Fallback to sample list if empty in mock/initial state
        setCharts(MOCK_CHARTS_LIST);
      }
    } catch (err) {
      console.error('Failed to load user charts:', err);
      setCharts(MOCK_CHARTS_LIST);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCharts();
  }, []);

  // Filter logic
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

  // Handle Delete Chart
  const handleDelete = async (chartId) => {
    setIsDeleting(true);
    try {
      await deleteChart(chartId);
      setCharts((prev) => prev.filter((c) => (c.chart_id || c.id) !== chartId));
      setDeletingId(null);
      setStatusNotice({ type: 'success', msg: 'Ephemeris chart deleted from vault.' });
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err) {
      console.error('Delete chart error:', err);
      setStatusNotice({ type: 'error', msg: 'Could not delete chart. Please try again.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(charts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `trikal_darshi_vault_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Download PDF simulation / trigger
  const handleDownloadPDF = (chart) => {
    setStatusNotice({
      type: 'info',
      msg: `Generating high-precision Vedic Dossier for ${chart?.full_name || 'vault'}...`,
    });
    setTimeout(() => {
      window.print();
    }, 800);
  };

  return (
    <div className="bg-[#FBF6EA] text-[#16223F] font-['Inter',sans-serif] antialiased min-h-screen flex flex-col selection:bg-[#F0DFAF] selection:text-[#12244A]">
      {/* ── TOP NAVIGATION BAR ── */}
      <header className="w-full bg-[#FFFDF6] border-b border-[#D9A63C]/30 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16 h-16 flex items-center justify-between">
          {/* Brand & Status Group */}
          <div className="flex items-center space-x-6">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2.5 focus:outline-hidden focus:ring-2 focus:ring-[#D9A63C] rounded px-1 cursor-pointer bg-transparent border-none text-left"
            >
              <div className="w-8 h-8 rounded-full bg-[#1F3A6B] flex items-center justify-center text-[#F0DFAF] shadow-inner font-['Fraunces',serif] font-bold text-base">
                ✦
              </div>
              <div className="flex flex-col">
                <span className="font-['Fraunces',serif] font-bold tracking-wider text-sm text-[#1F3A6B] leading-none uppercase">
                  Trikal Darshi
                </span>
                <span className="text-[10px] tracking-widest text-[#8C6718] font-mono mt-0.5 uppercase">
                  Jyotish Ephemeris
                </span>
              </div>
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-[#D9A63C]/30 hidden md:block" />

            {/* System Status Badge */}
            <div className="hidden lg:flex items-center space-x-2 text-xs font-mono text-[#5D6B88]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              <span>Ephemeris Connected • Swiss v2.10</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-sm font-medium">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 rounded-lg text-[#5D6B88] hover:text-[#16223F] hover:bg-[#F4EEDA] transition-colors cursor-pointer"
            >
              Observatory
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/mock-arjun-chart-108')}
              className="px-3.5 py-1.5 rounded-lg text-[#5D6B88] hover:text-[#16223F] hover:bg-[#F4EEDA] transition-colors cursor-pointer"
            >
              Soul Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="px-3.5 py-1.5 rounded-lg text-[#5D6B88] hover:text-[#16223F] hover:bg-[#F4EEDA] transition-colors cursor-pointer"
            >
              AskAI Guide
            </button>
            {/* Active Nav Item */}
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-[#1F3A6B] bg-[#F4EEDA] font-semibold flex items-center space-x-1.5 border border-[#D9A63C]/40 shadow-xs cursor-default"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9A63C]" />
              <span>Saved Charts</span>
            </button>
          </nav>

          {/* Utility & Profile Area */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="hidden sm:inline-flex items-center space-x-2 bg-[#1F3A6B] hover:bg-[#152A50] text-[#F0DFAF] px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer border border-[#D9A63C]/40"
            >
              <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">add_circle</span>
              <span>Calculate Kundali</span>
            </button>

            {/* User Avatar Pill */}
            <div
              className="w-8 h-8 rounded-full bg-[#1F3A6B] text-[#F0DFAF] flex items-center justify-center font-['Fraunces',serif] text-xs font-bold ring-2 ring-[#D9A63C]/40 cursor-pointer shadow-xs"
              title={user?.email || 'Active Profile'}
            >
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AS'}
            </div>
          </div>
        </div>
      </header>

      {/* ── NOTIFICATION TOAST ── */}
      {statusNotice && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
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

      {/* ── MAIN CONTENT VAULT ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 lg:px-16 py-8">
        {/* VAULT PAGE HEADER */}
        <section className="mb-8">
          <div className="flex items-center space-x-2 text-xs font-mono tracking-widest uppercase text-[#8C6718] mb-2 font-medium">
            <span>✦ Janma Kundali Vault</span>
            <span>•</span>
            <span>Secure Ephemeris Archive</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-['Fraunces',serif] text-3xl md:text-4xl font-semibold tracking-tight text-[#16223F]">
                Saved Astrological Charts
              </h1>
              <p className="text-sm md:text-base text-[#5D6B88] mt-1.5 max-w-2xl font-normal">
                Manage calculated natal profiles, compare divisional vargas (D1–D60), and reload session ephemerides with zero calculation delay.
              </p>
            </div>

            <div className="flex-shrink-0 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center space-x-2 bg-[#1F3A6B] hover:bg-[#152A50] text-[#F0DFAF] font-medium text-sm px-5 py-2.5 rounded-xl shadow-md border border-[#D9A63C]/30 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-[#D9A63C]">add</span>
                <span>Calculate New Kundali</span>
              </button>
            </div>
          </div>
        </section>

        {/* FILTER AND STATS CONTROLS */}
        <section className="bg-[#FFFDF6] border border-[#D9A63C]/30 rounded-2xl p-4 md:p-5 shadow-xs mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[260px] max-w-sm">
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

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[#1F3A6B] text-[#F0DFAF] shadow-xs'
                    : 'bg-[#FBF6EA] hover:bg-[#F4EEDA] text-[#5D6B88] border border-[#D9A63C]/30'
                }`}
              >
                All Charts ({charts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('family')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === 'family'
                    ? 'bg-[#1F3A6B] text-[#F0DFAF] shadow-xs'
                    : 'bg-[#FBF6EA] hover:bg-[#F4EEDA] text-[#5D6B88] border border-[#D9A63C]/30'
                }`}
              >
                Direct Family ({charts.filter((c) => c.relationship || c.category === 'family').length || 3})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('prashna')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === 'prashna'
                    ? 'bg-[#1F3A6B] text-[#F0DFAF] shadow-xs'
                    : 'bg-[#FBF6EA] hover:bg-[#F4EEDA] text-[#5D6B88] border border-[#D9A63C]/30'
                }`}
              >
                Horary / Prashna (1)
              </button>
            </div>
          </div>

          {/* Ephemeris Quota Status Chip */}
          <div className="flex-shrink-0 flex items-center space-x-2.5 bg-[#FBF6EA] border border-[#D9A63C]/40 px-3.5 py-2 rounded-xl text-xs font-mono text-[#5D6B88]">
            <div className="w-2 h-2 rounded-full bg-[#D9A63C] animate-pulse" />
            <span className="text-[#16223F] font-semibold">{charts.length} / 50</span>
            <span>Cloud Ephemerides Stored</span>
            <span className="text-[#D9A63C]">•</span>
            <span className="text-[#8C6718]">Sidereal Lahiri Active</span>
          </div>
        </section>

        {/* SAVED CHARTS LIST */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-[#FFFDF6] border border-[#D9A63C]/30 rounded-2xl p-12 text-center">
              <span className="material-symbols-outlined text-[36px] text-[#D9A63C] animate-spin mb-3">
                progress_activity
              </span>
              <p className="text-sm font-medium text-[#16223F]">Loading your saved natal ephemeris vault...</p>
            </div>
          ) : filteredCharts.length === 0 ? (
            <div className="bg-[#FFFDF6] border border-[#D9A63C]/30 rounded-2xl p-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-[#D9A63C] mb-3">
                auto_stories
              </span>
              <h3 className="font-['Fraunces',serif] text-lg font-bold text-[#16223F]">No Saved Charts Found</h3>
              <p className="text-xs text-[#5D6B88] max-w-sm mx-auto mt-1 mb-4">
                No astrological charts match your current filter. Create a new Janma Kundali to archive it in your vault.
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 bg-[#1F3A6B] text-[#F0DFAF] text-xs font-semibold px-4 py-2 rounded-xl border border-[#D9A63C]/40 cursor-pointer"
              >
                <span>Calculate Kundali</span>
                <span>➔</span>
              </button>
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
                    {/* Native Identity & Thumbnail */}
                    <div className="flex items-start space-x-4 min-w-[280px]">
                      {/* Mini North Indian Kundali SVG Thumbnail */}
                      <div className="w-14 h-14 flex-shrink-0 bg-[#FBF6EA] border border-[#D9A63C]/50 rounded-xl p-1 shadow-inner relative flex items-center justify-center">
                        <svg className="w-full h-full stroke-[#1F3A6B] stroke-[1.5] fill-none" viewBox="0 0 100 100">
                          <rect height="96" width="96" x="2" y="2" />
                          <line x1="2" x2="98" y1="2" y2="98" />
                          <line x1="98" x2="2" y1="2" y2="98" />
                          <polygon points="50,2 98,50 50,98 2,50" />
                        </svg>
                        <span className="absolute text-[8px] font-mono font-bold text-[#8C6718] bg-[#FFFDF6] px-0.5 rounded border border-[#D9A63C]/40">
                          {chart.division_badge || (idx === 0 ? 'D10' : idx === 1 ? 'D9' : idx === 2 ? 'D1' : 'D7')}
                        </span>
                      </div>

                      {/* Profile Info */}
                      <div>
                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                          <h2 className="font-['Fraunces',serif] font-bold text-lg text-[#16223F] leading-snug">
                            {chart.full_name || 'Vedic Native'}
                          </h2>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isPrimary
                                ? 'bg-[#F0DFAF] text-[#12244A] border-[#D9A63C]/40'
                                : idx === 1
                                ? 'bg-[#E8EFFB] text-[#1F3A6B] border-[#1F3A6B]/20'
                                : idx === 2
                                ? 'bg-[#F4EEDA] text-[#5D6B88] border-[#D9A63C]/30'
                                : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}
                          >
                            {chart.relationship || (isPrimary ? 'Self (Primary)' : idx === 1 ? 'Spouse' : idx === 2 ? 'Father' : 'Family')}
                          </span>
                        </div>
                        <p className="text-xs text-[#5D6B88] font-mono mt-1 flex items-center space-x-1.5 flex-wrap">
                          <span>{chart.date_of_birth || '18 Nov 1988'}</span>
                          <span>•</span>
                          <span>{chart.time_of_birth || '06:42 AM'}</span>
                          <span>•</span>
                          <span>{chart.city_of_birth || 'Varanasi, India'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Astrological Key Vectors */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 flex-1 bg-[#FBF6EA]/70 p-3 rounded-xl border border-[#D9A63C]/20 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase font-mono tracking-wider text-[#8E9BB5]">
                          Lagna (Ascendant)
                        </span>
                        <span className="font-medium text-[#16223F] mt-0.5 block truncate">
                          {chart.lagna || 'Scorpio (Vrishchika)'}
                        </span>
                        <span className="font-mono text-[11px] text-[#8C6718]">
                          {chart.lagna_degree || '14°28\''}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-mono tracking-wider text-[#8E9BB5]">
                          Moon Nakshatra
                        </span>
                        <span className="font-medium text-[#16223F] mt-0.5 block truncate">
                          {chart.moon_nakshatra || 'Rohini (Taurus)'}
                        </span>
                        <span className="font-mono text-[11px] text-[#8C6718]">
                          {chart.moon_degree || '18°42\' (Exalted)'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-mono tracking-wider text-[#8E9BB5]">
                          Atmakaraka
                        </span>
                        <span className="font-medium text-[#16223F] mt-0.5 block truncate">
                          {chart.atmakaraka || 'Guru (Jupiter)'}
                        </span>
                        <span className="font-mono text-[11px] text-[#5D6B88]">Punarvasu</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-mono tracking-wider text-[#8E9BB5]">
                          Active Mahadasha
                        </span>
                        <span className="font-medium text-[#1F3A6B] mt-0.5 block font-semibold truncate">
                          {chart.active_mahadasha || 'Jupiter - Saturn'}
                        </span>
                        <span className="font-mono text-[11px] text-emerald-700">Sub-period Active</span>
                      </div>
                    </div>

                    {/* Actions & Delete Confirmation Popover */}
                    <div className="relative flex items-center space-x-2.5 flex-shrink-0 self-end lg:self-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/${chartId}`)}
                        className="inline-flex items-center space-x-1.5 bg-[#1F3A6B] hover:bg-[#152A50] text-[#F0DFAF] text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer border border-[#D9A63C]/30"
                      >
                        <span>Open in Dashboard</span>
                        <span>➔</span>
                      </button>

                      {/* Delete Trigger */}
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

                      {/* Delete Confirmation Popover */}
                      {isDeleteOpen && (
                        <div className="absolute right-0 top-12 z-30 w-72 bg-[#FFFDF6] border border-red-300 rounded-xl shadow-xl p-3.5 text-xs text-[#16223F] animate-fade-in">
                          <div className="flex items-start space-x-2">
                            <span className="text-red-600 font-bold text-base leading-none">⚠️</span>
                            <div>
                              <p className="font-semibold text-[#16223F]">Delete {chart.full_name}’s Chart?</p>
                              <p className="text-[11px] text-[#5D6B88] mt-1 leading-normal">
                                This will remove cached D1–D60 vargas, Ashtakavarga charts, and synced remedial notes from PostgreSQL &amp; Redis.
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

        {/* QUICK EXPORT BANNER */}
        <section className="mt-8 bg-[#F4EEDA] border border-[#D9A63C]/40 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-[#1F3A6B] text-[#F0DFAF] flex items-center justify-center font-['Fraunces',serif] text-lg font-bold flex-shrink-0 shadow-inner">
              📜
            </div>
            <div>
              <h3 className="font-['Fraunces',serif] font-bold text-base text-[#16223F]">
                Ephemeris Synchronization &amp; Vault Export
              </h3>
              <p className="text-xs text-[#5D6B88] mt-0.5 max-w-xl">
                Download your raw sidereal coordinates in structured JSON or generate a comprehensive Vedic Dossier (PDF). Synchronized with Swiss Ephemeris v2.10.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex-1 md:flex-initial inline-flex items-center justify-center space-x-2 bg-[#FFFDF6] hover:bg-white text-[#16223F] border border-[#D9A63C]/50 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-[#8C6718]">file_download</span>
              <span>Export Kundali JSON</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadPDF(charts[0])}
              className="flex-1 md:flex-initial inline-flex items-center justify-center space-x-2 bg-[#1F3A6B] hover:bg-[#152A50] text-[#F0DFAF] px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer border border-[#D9A63C]/40"
            >
              <span className="material-symbols-outlined text-[16px] text-[#F0DFAF]">picture_as_pdf</span>
              <span>Download PDF Dossier</span>
            </button>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="w-full bg-[#F4EEDA] border-t border-[#D9A63C]/30 py-6 mt-12 text-xs text-[#5D6B88]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="font-['Fraunces',serif] font-bold text-sm tracking-wider text-[#1F3A6B]">
              TRIKAL DARSHI
            </span>
            <span>•</span>
            <span className="font-mono text-[11px]">
              Vedic Precision Computing • Sidereal Lahiri (Chitra Paksha) 23°51'12"
            </span>
          </div>

          <div className="flex items-center space-x-6 text-xs font-medium">
            <button type="button" onClick={() => navigate('/')} className="hover:text-[#16223F] transition-colors cursor-pointer">
              Observatory
            </button>
            <button type="button" onClick={() => navigate('/dashboard/mock-arjun-chart-108')} className="hover:text-[#16223F] transition-colors cursor-pointer">
              Soul Dashboard
            </button>
            <button type="button" onClick={() => navigate('/chat')} className="hover:text-[#16223F] transition-colors cursor-pointer">
              AskAI Guide
            </button>
            <button type="button" onClick={() => navigate('/charts')} className="hover:text-[#16223F] transition-colors cursor-pointer">
              Saved Ephemerides
            </button>
          </div>

          <div className="text-right text-[11px] font-mono text-[#8E9BB5]">
            © {new Date().getFullYear()} Trikal Darshi. All planetary coordinates verified.
          </div>
        </div>
      </footer>
    </div>
  );
}
