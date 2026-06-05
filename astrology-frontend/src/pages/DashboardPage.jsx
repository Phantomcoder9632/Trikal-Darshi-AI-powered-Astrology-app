import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChart, getInterpretation, getGenerationProgress } from '../services/api';

// Child Components
import ChartSidebar, { TAB_CHART_CONFIG } from '../components/ChartSidebar';
import PlanetTable   from '../components/PlanetTable';
import TransitBanner from '../components/TransitBanner';
import CosmicSummary from '../components/CosmicSummary';
import TabNavigation from '../components/TabNavigation';
import RemedyCards   from '../components/RemedyCards';
import ProfileCard   from '../components/ProfileCard';

// Helper: get 1-2 capital initials from a full name
function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function DashboardPage() {
  const { chartId } = useParams();
  const navigate    = useNavigate();

  const [chartData,    setChartData]    = useState(null);
  const [loadingChart, setLoadingChart] = useState(true);
  const [chartError,   setChartError]   = useState('');

  // Tab state
  const [activeTab,        setActiveTab]        = useState(1);
  const [interpretations,  setInterpretations]  = useState({});
  const [tabLoading,       setTabLoading]       = useState({});
  const [tabError,         setTabError]         = useState({});
  const [language,         setLanguage]         = useState('english');
  const [pendingTranslation, setPendingTranslation] = useState({});
  const [retryTrigger,     setRetryTrigger]     = useState(0);

  // Background pre-generation progress
  const [bgProgress,       setBgProgress]       = useState(null);
  const pollIntervalRef                         = useRef(null);

  // Chart toggle within a tab
  const [activeChartIdx, setActiveChartIdx] = useState(0);

  // Reset chart toggle when tab changes
  useEffect(() => { setActiveChartIdx(0); }, [activeTab]);

  const handleLanguageChange = (lang) => {
    if (lang === language) return;
    setLanguage(lang);
    setInterpretations({});
    setPendingTranslation({});
    setTabError({});
  };

  // ── 1. Fetch chart ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartId) return;
    const fetchChart = async () => {
      try {
        setLoadingChart(true);
        setChartError('');
        const data = await getChart(chartId);
        setChartData(data);
      } catch (err) {
        console.error(err);
        setChartError('Could not retrieve your planetary chart. Please return and try again.');
      } finally {
        setLoadingChart(false);
      }
    };
    fetchChart();
  }, [chartId]);

  // ── 2. Stream interpretation for active tab ─────────────────────────────
  useEffect(() => {
    if (!chartId || loadingChart || chartError) return;
    if (interpretations[activeTab] || pendingTranslation[activeTab]) return; // already loaded or pending

    const streamTab = async () => {
      setTabLoading((prev)  => ({ ...prev, [activeTab]: true  }));
      setTabError((prev)    => ({ ...prev, [activeTab]: ''    }));
      setInterpretations((prev) => ({ ...prev, [activeTab]: '' }));
      setPendingTranslation((prev) => ({ ...prev, [activeTab]: false }));

      try {
        await getInterpretation(chartId, activeTab, language, (chunk) => {
          if (chunk === '{"status": "pending"}') {
            setPendingTranslation((prev) => ({ ...prev, [activeTab]: true }));
            setInterpretations((prev) => {
              const copy = { ...prev };
              delete copy[activeTab];
              return copy;
            });
          } else {
            setInterpretations((prev) => ({
              ...prev,
              [activeTab]: (prev[activeTab] || '') + chunk,
            }));
          }
        });
      } catch (err) {
        console.error(err);
        setTabError((prev) => ({
          ...prev,
          [activeTab]: 'Planetary alignment stream interrupted. Click Retry below.',
        }));
      } finally {
        setTabLoading((prev) => ({ ...prev, [activeTab]: false }));
      }
    };

    streamTab();
  }, [chartId, activeTab, language, loadingChart, chartError, retryTrigger]);

  // ── 2b. Poll for pending translations ──────────────────────────────────
  useEffect(() => {
    if (pendingTranslation[activeTab]) {
      const timer = setTimeout(() => {
        setPendingTranslation((prev) => ({ ...prev, [activeTab]: false }));
        setRetryTrigger((r) => r + 1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [pendingTranslation, activeTab]);

  // ── 3. Poll background pre-generation progress ──────────────────────────
  useEffect(() => {
    if (!chartId || loadingChart || chartError) return;

    const poll = async () => {
      const data = await getGenerationProgress(chartId);
      if (!data) return;
      setBgProgress(data);
      // Stop polling once all tabs are generated
      if (data.is_complete) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        // Auto-hide the badge after 4 seconds
        setTimeout(() => setBgProgress(null), 4000);
      }
    };

    // Initial poll immediately, then every 4 seconds
    poll();
    pollIntervalRef.current = setInterval(poll, 4000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [chartId, loadingChart, chartError]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loadingChart) {
    return (
      <div className="page-loading">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-container text-[44px] animate-spin">
            progress_activity
          </span>
          <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-50" />
        </div>
        <p className="font-headline-md text-primary text-lg uppercase tracking-widest animate-pulse">
          Channeling Celestial Blueprints…
        </p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (chartError) {
    return (
      <div className="page-error">
        <div className="glass-card max-w-[440px] w-full p-10 rounded-2xl border border-error/25 shadow-xl flex flex-col items-center gap-5">
          <span
            className="material-symbols-outlined text-error text-[48px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            warning
          </span>
          <h2 className="font-headline-md text-error text-xl uppercase tracking-wider">
            ✦ System Warning ✦
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">{chartError}</p>
          <button
            id="returnHomeBtn"
            onClick={() => navigate('/')}
            className="blueprint-button shimmer-button max-w-xs w-full"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Return to Birth Chamber
          </button>
        </div>
      </div>
    );
  }

  // ── Dasha display ────────────────────────────────────────────────────────
  const dasha = chartData?.dasha || {};
  const currentDashaText =
    dasha.mahadasha && dasha.antardasha
      ? `${dasha.mahadasha} MD · ${dasha.antardasha} AD`
      : 'Calculations Active';

  // ── Planet table data: follows active chart idx ──────────────────────────
  const tabConfig    = TAB_CHART_CONFIG[activeTab] || TAB_CHART_CONFIG[1];
  const currentKey   = tabConfig?.keys?.[activeChartIdx];
  const tablePlanets = currentKey && chartData?.[currentKey]?.planets
    ? chartData[currentKey].planets
    : chartData?.planets;

  return (
    <div className="w-full min-h-screen bg-background text-on-background font-body-md yantra-bg flex flex-col selection:bg-primary-container/30">

      {/* ── Sticky Header ────────────────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="dashboard-header-inner">

          {/* Logo */}
          <button
            id="logoHomeBtn"
            onClick={() => navigate('/')}
            className="font-wordmark text-[18px] sm:text-[20px] tracking-[0.15em] text-primary hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0"
            aria-label="Go to home page"
          >
            TRIKAL DARSHI
          </button>

          {/* Right side */}
          <div className="flex items-center gap-4">

            {/* ── Background pre-gen progress pill ── */}
            {bgProgress && !bgProgress.is_complete && (
              <div
                id="bgProgressPill"
                className="hidden sm:flex items-center gap-2 bg-primary/8 border border-primary/20 px-3 py-1.5 rounded-full animate-pulse"
                title={`${bgProgress.completed_tabs.length} of ${bgProgress.total_tabs} sections pre-generated`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                <span className="font-label-sm text-[9px] text-primary font-bold uppercase tracking-wider whitespace-nowrap">
                  ✦ Preparing Blueprint — {bgProgress.completed_tabs.length}/{bgProgress.total_tabs} Sections Ready
                </span>
                {/* Mini progress bar */}
                <div className="w-16 h-1 rounded-full bg-primary/15 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${bgProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* All done badge (briefly shown) */}
            {bgProgress && bgProgress.is_complete && (
              <div
                id="bgCompletePill"
                className="hidden sm:flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="font-label-sm text-[9px] text-green-700 font-bold uppercase tracking-wider whitespace-nowrap">
                  ✦ All Sections Ready
                </span>
              </div>
            )}

            {/* Language Toggle */}
            <div className="flex bg-surface-container/50 border border-outline-variant/30 rounded-full p-0.5">
              {[
                { id: 'english', label: 'EN' },
                { id: 'hindi', label: 'हि' },
                { id: 'bengali', label: 'বাং' }
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => handleLanguageChange(lang.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    language === lang.id
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Name + Avatar Chip */}
            <div className="header-avatar-chip">
              <div className="header-avatar-initials" aria-hidden="true">
                {getInitials(chartData?.full_name)}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="header-name-text" title={chartData?.full_name || 'Seeker'}>
                  {chartData?.full_name || 'Seeker'}
                </span>
                <div className="header-dasha-pill">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                  <span>{currentDashaText}</span>
                </div>
              </div>
            </div>

            {/* Action icons */}
            <div className="flex items-center gap-2">
              <button
                id="notifBtn"
                aria-label="Notifications"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors cursor-pointer bg-transparent border-none"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                  notifications
                </span>
              </button>
              <button
                id="accountBtn"
                aria-label="Account"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors cursor-pointer bg-transparent border-none"
              >
                <span
                  className="material-symbols-outlined text-primary text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  account_circle
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-8 md:px-10 py-5 flex flex-col">

        {/* Jupiter Transit Banner */}
        <TransitBanner />

        {/* Two-column grid */}
        <div className="dashboard-grid">

          {/* ── Left sidebar ────────────────────────────────────────────── */}
          <aside className="dashboard-sidebar flex flex-col gap-4">

            {/* Profile / Name card */}
            <ProfileCard chartData={chartData} />

            {/* Chart viewer */}
            <ChartSidebar
              activeTab={activeTab}
              chartData={chartData}
              activeChartIdx={activeChartIdx}
              setActiveChartIdx={setActiveChartIdx}
            />

            {/* Planet positions table */}
            <div className="dashboard-card overflow-hidden animate-up delay-3" style={{ padding: 0 }}>
              <PlanetTable planets={tablePlanets} />
            </div>

          </aside>

          {/* ── Right content ────────────────────────────────────────────── */}
          <div className="dashboard-content flex flex-col gap-4">

            {/* Cosmic Blueprint Summary */}
            <div className="animate-up delay-3">
              <CosmicSummary chartData={chartData} />
            </div>

            {/* Tab navigation + interpretation */}
            <div className="animate-up delay-4 flex flex-col gap-4">
              <TabNavigation
                chartId={chartId}
                activeTab={activeTab}
                onTabChange={(tabId) => setActiveTab(tabId)}
                interpretations={interpretations}
                tabLoadingState={tabLoading}
              />

              {/* Pending Translation Message */}
              {pendingTranslation[activeTab] && (
                 <div className="flex flex-col items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl p-5 text-center mt-2 animate-fade-in">
                   <div className="relative w-8 h-8 flex items-center justify-center">
                     <span className="material-symbols-outlined text-primary text-[28px] animate-spin">
                       sync
                     </span>
                   </div>
                   <p className="text-primary text-sm font-medium">Translation is being prepared, please try again in a moment...</p>
                 </div>
              )}

              {/* Tab error banner */}
              {tabError[activeTab] && (
                <div className="flex flex-col items-center gap-3 bg-error/5 border border-error/20 rounded-2xl p-5 text-center">
                  <span
                    className="material-symbols-outlined text-error text-[28px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    error
                  </span>
                  <p className="text-error text-sm font-medium">{tabError[activeTab]}</p>
                  <button
                    id={`retryTabBtn-${activeTab}`}
                    onClick={() => {
                      setInterpretations((prev) => {
                        const copy = { ...prev };
                        delete copy[activeTab];
                        return copy;
                      });
                    }}
                    className="bg-error/10 border border-error/30 rounded-xl text-error hover:bg-error/20 px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Retry Stream
                  </button>
                </div>
              )}
            </div>

            {/* Remedy cards — shown only on Tab 8 */}
            {activeTab === 8 && !tabLoading[8] && interpretations[8] && (
              <div className="animate-up">
                <RemedyCards remedyText={interpretations[8]} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-outline-variant/20 bg-white/70 mt-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 md:px-10 py-7 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="font-wordmark text-primary text-[15px] tracking-wider">
              TRIKAL DARSHI
            </span>
            <p className="text-xs text-on-surface-variant">
              © 2024 · Ancient Wisdom, Modern Precision
            </p>
          </div>
          <nav className="flex gap-5 text-xs font-medium text-on-surface-variant">
            {['Privacy Policy', 'Terms of Service', 'Consultation Support'].map((item) => (
              <a key={item} href="#" className="hover:text-primary transition-colors">
                {item}
              </a>
            ))}
          </nav>
        </div>
      </footer>

    </div>
  );
}
